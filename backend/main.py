import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

MOCK_RESPONSE = {
    "verdict": "Unverifiable",
    "explanation": "This is a mock response for testing purposes. Provide a real OpenAI API key to get actual fact-checking results.",
    "confidence": 50,
}

SYSTEM_PROMPT = """You are a fact-checker. Given a claim or piece of text, analyze it and respond with a JSON object containing:
- "verdict": one of "True", "False", "Misleading", or "Unverifiable"
- "explanation": a concise explanation of your verdict (1-3 sentences)
- "confidence": an integer from 0 to 100 representing your confidence in the verdict

Respond ONLY with valid JSON, no markdown, no extra text."""


class CheckRequest(BaseModel):
    text: str


class CheckResponse(BaseModel):
    verdict: str
    explanation: str
    confidence: int


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/check", response_model=CheckResponse)
def check_fact(request: CheckRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if not OPENAI_API_KEY or OPENAI_API_KEY == "test":
        return MOCK_RESPONSE

    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY)

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": request.text},
        ],
        response_format={"type": "json_object"},
    )

    raw = completion.choices[0].message.content
    data = json.loads(raw)

    verdict = data.get("verdict", "Unverifiable")
    if verdict not in ("True", "False", "Misleading", "Unverifiable"):
        verdict = "Unverifiable"

    return CheckResponse(
        verdict=verdict,
        explanation=str(data.get("explanation", "")),
        confidence=int(data.get("confidence", 50)),
    )
