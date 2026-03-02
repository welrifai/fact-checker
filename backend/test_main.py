import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

os.environ["OPENAI_API_KEY"] = "test"

from main import app  # noqa: E402


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_check_fact():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/check", json={"text": "The Earth is flat."})
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] in ("True", "False", "Misleading", "Unverifiable")
    assert isinstance(data["explanation"], str)
    assert isinstance(data["confidence"], int)


@pytest.mark.asyncio
async def test_check_fact_empty_text():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/check", json={"text": "   "})
    assert response.status_code == 400
