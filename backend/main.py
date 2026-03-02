"""
Real-Time Fact-Checker Backend
FastAPI application that fetches YouTube captions and streams AI fact-checking
results back to the client via Server-Sent Events.
"""

import asyncio
import json
import re
import uuid
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from youtube_transcript_api import (
    NoTranscriptFound,
    TranscriptsDisabled,
    YouTubeTranscriptApi,
)

load_dotenv()

app = FastAPI(title="Real-Time Fact-Checker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_client = AsyncOpenAI()

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class AnalyzeRequest(BaseModel):
    url: str


class AnalyzeResponse(BaseModel):
    session_id: str
    video_id: str
    title: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_YOUTUBE_PATTERNS = [
    r"(?:v=)([A-Za-z0-9_-]{11})(?:[&?#]|$)",
    r"youtu\.be/([A-Za-z0-9_-]{11})(?:[?#]|$)",
    r"(?:embed|shorts)/([A-Za-z0-9_-]{11})(?:[?#/]|$)",
]


def extract_video_id(url: str) -> str | None:
    for pattern in _YOUTUBE_PATTERNS:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


FACT_CHECK_SYSTEM_PROMPT = """You are an expert real-time fact-checker and educator.
You will be given a short segment of spoken text (a caption snippet) from a video.
Your task is to analyse the statement and return a JSON object with:

{
  "verdict": "<one of: true | false | contentious | context | unverifiable>",
  "confidence": <0-100 integer>,
  "explanation": "<one or two sentence explanation>",
  "references": [
    {"title": "<source title>", "url": "<plausible source URL>", "snippet": "<brief quote or summary>"}
  ],
  "definitions": [
    {"term": "<technical or unusual term>", "definition": "<clear short definition>"}
  ]
}

Verdict meanings:
  true         – The statement is accurate and well-supported.
  false        – The statement is factually incorrect.
  contentious  – The statement is debated or disputed among credible sources.
  context      – The statement needs important context to be properly understood.
  unverifiable – The statement cannot be verified with available knowledge.

Rules:
- Only include "definitions" for technical, unusual, or potentially misunderstood terms.
- Only include "references" that are real and verifiable; use plausible URLs to established sources.
- Keep the explanation concise (≤ 40 words).
- Respond ONLY with the JSON object; no markdown, no extra text."""


async def fact_check_caption(text: str) -> dict:
    """Send a caption segment to OpenAI and return the structured fact-check."""
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": FACT_CHECK_SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        return json.loads(raw)
    except Exception as exc:
        return {
            "verdict": "unverifiable",
            "confidence": 0,
            "explanation": f"Fact-check error: {exc}",
            "references": [],
            "definitions": [],
        }


# In-memory session store: session_id -> list of caption dicts
_sessions: dict[str, list[dict]] = {}


def _group_captions(
    captions: list[dict], window_seconds: float = 8.0
) -> list[dict]:
    """Merge short caption entries into ~8-second chunks for richer fact-checking."""
    groups: list[dict] = []
    current_text: list[str] = []
    current_start: float = 0.0
    current_end: float = 0.0

    for cap in captions:
        start = cap.get("start", 0.0)
        duration = cap.get("duration", 0.0)
        end = start + duration
        text = cap.get("text", "").strip()

        if not current_text:
            current_start = start
            current_end = end
            current_text.append(text)
        elif end - current_start <= window_seconds:
            current_text.append(text)
            current_end = end
        else:
            groups.append(
                {
                    "start": current_start,
                    "end": current_end,
                    "text": " ".join(current_text),
                }
            )
            current_start = start
            current_end = end
            current_text = [text]

    if current_text:
        groups.append(
            {
                "start": current_start,
                "end": current_end,
                "text": " ".join(current_text),
            }
        )

    return groups


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """
    Accept a YouTube URL, fetch the transcript, and return a session ID that
    the client can use to open the SSE stream.
    """
    video_id = extract_video_id(request.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid or unsupported video URL.")

    try:
        transcript_list = YouTubeTranscriptApi.get_transcript(
            video_id, languages=["en", "en-US", "en-GB"]
        )
    except TranscriptsDisabled:
        raise HTTPException(
            status_code=422,
            detail="Captions are disabled for this video.",
        )
    except NoTranscriptFound:
        raise HTTPException(
            status_code=422,
            detail="No English captions found for this video.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch transcript: {exc}",
        )

    grouped = _group_captions(transcript_list)
    session_id = str(uuid.uuid4())
    _sessions[session_id] = grouped

    return AnalyzeResponse(
        session_id=session_id,
        video_id=video_id,
        title=f"YouTube Video ({video_id})",
    )


@app.get("/api/stream/{session_id}")
async def stream(session_id: str):
    """
    SSE endpoint that streams fact-checked caption events for a given session.
    Each event is a JSON object with caption text, timestamps, and AI analysis.
    """
    captions = _sessions.get(session_id)
    if captions is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    async def event_generator() -> AsyncGenerator[dict, None]:
        yield {"event": "start", "data": json.dumps({"total": len(captions)})}

        for i, cap in enumerate(captions):
            analysis = await fact_check_caption(cap["text"])
            payload = {
                "id": i,
                "start": cap["start"],
                "end": cap["end"],
                "text": cap["text"],
                **analysis,
            }
            yield {
                "event": "caption",
                "data": json.dumps(payload),
            }
            # Small delay to simulate real-time pacing; also avoids rate limits
            await asyncio.sleep(0.3)

        yield {"event": "done", "data": "{}"}
        # Clean up session
        _sessions.pop(session_id, None)

    return EventSourceResponse(event_generator())


@app.get("/api/health")
async def health():
    return {"status": "ok"}
