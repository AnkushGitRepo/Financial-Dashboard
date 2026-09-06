"""PDF plain-text extraction (app/ingestion/pdf_text.py) + the
POST /documents/extract-text route. No network, no DB."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api import deps
from app.ingestion.pdf_text import PdfTextError, extract_pages
from app.main import app

FIXTURE_PDF = Path(__file__).parent / "fixtures" / "sample_annual_report.pdf"


@pytest.fixture
def client():
    async def fake_get_db():
        yield None

    app.dependency_overrides[deps.get_db] = fake_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_extract_pages_reads_the_fixture_pdf():
    pages = extract_pages(FIXTURE_PDF.read_bytes())
    assert len(pages) >= 1
    assert all(p["text"].strip() for p in pages)
    assert [p["page"] for p in pages] == sorted(p["page"] for p in pages)


def test_extract_pages_respects_max_pages():
    one = extract_pages(FIXTURE_PDF.read_bytes(), max_pages=1)
    assert len(one) <= 1


def test_extract_pages_raises_pdftexterror_on_garbage():
    with pytest.raises(PdfTextError):
        extract_pages(b"this is not a pdf at all")


def test_route_token_matrix(client, monkeypatch):
    # Unset token -> 503.
    res = client.post("/documents/extract-text", json={"url": "https://x/a.pdf"})
    assert res.status_code == 503

    monkeypatch.setattr("app.api.routes.pdf_text._settings.ipo_ingest_token", "s3cret")
    assert client.post("/documents/extract-text", json={"url": "https://x/a.pdf"}).status_code == 401
    assert (
        client.post(
            "/documents/extract-text",
            json={"url": "https://x/a.pdf"},
            headers={"Authorization": "Bearer nope"},
        ).status_code
        == 401
    )


def test_route_success(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.pdf_text._settings.ipo_ingest_token", "s3cret")

    async def fake_fetch(url, *, max_pages=None):
        return {
            "url": url,
            "bytes": 1234,
            "page_count": 1,
            "pages": [{"page": 1, "text": "Hello world."}],
            "text": "Hello world.",
        }

    monkeypatch.setattr("app.api.routes.pdf_text.fetch_pdf_text", fake_fetch)
    res = client.post(
        "/documents/extract-text",
        json={"url": "https://x/report.pdf", "max_pages": 5},
        headers={"Authorization": "Bearer s3cret"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["page_count"] == 1
    assert body["pages"][0]["text"] == "Hello world."
    assert body["text"] == "Hello world."


def test_route_maps_pdferror_to_422(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.pdf_text._settings.ipo_ingest_token", "s3cret")

    async def boom(url, *, max_pages=None):
        raise PdfTextError("response does not look like a PDF")

    monkeypatch.setattr("app.api.routes.pdf_text.fetch_pdf_text", boom)
    res = client.post(
        "/documents/extract-text",
        json={"url": "https://x/notreal"},
        headers={"Authorization": "Bearer s3cret"},
    )
    assert res.status_code == 422
    assert "does not look like a PDF" in res.json()["detail"]


def test_route_rejects_non_http_url(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.pdf_text._settings.ipo_ingest_token", "s3cret")
    res = client.post(
        "/documents/extract-text",
        json={"url": "file:///etc/passwd"},
        headers={"Authorization": "Bearer s3cret"},
    )
    assert res.status_code == 422
