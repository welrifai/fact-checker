"""
Tests for helper functions in the fact-checker backend.
Run with: pytest test_main.py -v
"""
import os
import sys

# Ensure OPENAI_API_KEY is set before importing main so AsyncOpenAI doesn't error
os.environ.setdefault("OPENAI_API_KEY", "test-key")

import pytest

sys.path.insert(0, os.path.dirname(__file__))
from main import _group_captions, extract_video_id  # noqa: E402


# ---------------------------------------------------------------------------
# extract_video_id
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "url, expected",
    [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ?t=42", "dQw4w9WgXcQ"),
    ],
)
def test_extract_video_id_valid(url: str, expected: str) -> None:
    assert extract_video_id(url) == expected


@pytest.mark.parametrize(
    "url",
    [
        "https://vimeo.com/123456",
        "https://example.com",
        "not-a-url",
        "",
    ],
)
def test_extract_video_id_invalid(url: str) -> None:
    assert extract_video_id(url) is None


# ---------------------------------------------------------------------------
# _group_captions
# ---------------------------------------------------------------------------


def test_group_captions_merges_short_segments() -> None:
    caps = [
        {"start": 0.0, "duration": 3.0, "text": "Hello"},
        {"start": 3.0, "duration": 3.0, "text": "world"},
    ]
    groups = _group_captions(caps, window_seconds=8.0)
    assert len(groups) == 1
    assert groups[0]["text"] == "Hello world"
    assert groups[0]["start"] == 0.0
    assert groups[0]["end"] == 6.0


def test_group_captions_splits_long_segments() -> None:
    caps = [
        {"start": 0.0, "duration": 3.0, "text": "Hello"},
        {"start": 3.0, "duration": 3.0, "text": "world"},
        {"start": 10.0, "duration": 3.0, "text": "new chunk"},
    ]
    groups = _group_captions(caps, window_seconds=8.0)
    assert len(groups) == 2
    assert groups[0]["text"] == "Hello world"
    assert groups[1]["text"] == "new chunk"


def test_group_captions_empty() -> None:
    assert _group_captions([], window_seconds=8.0) == []


def test_group_captions_single() -> None:
    caps = [{"start": 5.0, "duration": 2.0, "text": "Solo"}]
    groups = _group_captions(caps)
    assert len(groups) == 1
    assert groups[0]["text"] == "Solo"
