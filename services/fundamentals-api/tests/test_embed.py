"""Embedding endpoint + embed_texts helper. No model download, no network."""

import pytest
from fastapi.testclient import TestClient

from app.api import deps
from app.ingestion import embeddings
from app.ingestion.embeddings import EMBED_DIM, EmbeddingError, embed_texts
from app.main import app


class _FakeVec(list):
    def tolist(self):
        return list(self)


class _FakeModel:
    def embed(self, texts):
        return [_FakeVec([0.1] * EMBED_DIM) for _ in texts]


@pytest.fixture
def client():
    async def fake_get_db():
        yield None

    app.dependency_overrides[deps.get_db] = fake_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _reset_model_cache():
    embeddings._model.cache_clear()
    yield
    embeddings._model.cache_clear()


def test_embed_texts_empty_returns_empty_without_loading(monkeypatch):
    def boom():
        raise AssertionError("model should not be loaded for an empty batch")

    monkeypatch.setattr(embeddings, "_model", boom)
    assert embed_texts([]) == []


def test_embed_texts_returns_unit_dim_vectors(monkeypatch):
    monkeypatch.setattr(embeddings, "_model", lambda: _FakeModel())
    out = embed_texts(["hello", "world"])
    assert len(out) == 2
    assert all(len(v) == EMBED_DIM for v in out)


def test_embed_texts_rejects_a_wrong_dimension(monkeypatch):
    class BadModel:
        def embed(self, texts):
            return [_FakeVec([0.0] * 512) for _ in texts]

    monkeypatch.setattr(embeddings, "_model", lambda: BadModel())
    with pytest.raises(EmbeddingError, match="expected 384"):
        embed_texts(["x"])


def test_route_token_matrix(client, monkeypatch):
    res = client.post("/embed", json={"texts": ["a"]})
    assert res.status_code == 503  # token unset in tests

    monkeypatch.setattr("app.api.routes.embed._settings.ipo_ingest_token", "s3cret")
    assert client.post("/embed", json={"texts": ["a"]}).status_code == 401
    assert (
        client.post(
            "/embed", json={"texts": ["a"]}, headers={"Authorization": "Bearer nope"}
        ).status_code
        == 401
    )


def test_route_success(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.embed._settings.ipo_ingest_token", "s3cret")
    monkeypatch.setattr(embeddings, "_model", lambda: _FakeModel())

    res = client.post(
        "/embed",
        json={"texts": ["reliance results", "tcs order book"]},
        headers={"Authorization": "Bearer s3cret"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["dim"] == EMBED_DIM
    assert body["model"] == "BAAI/bge-small-en-v1.5"
    assert len(body["vectors"]) == 2
    assert len(body["vectors"][0]) == EMBED_DIM


def test_route_maps_embedding_error_to_503(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.embed._settings.ipo_ingest_token", "s3cret")

    def boom():
        raise EmbeddingError("fastembed is not installed")

    monkeypatch.setattr(embeddings, "_model", boom)
    res = client.post(
        "/embed", json={"texts": ["x"]}, headers={"Authorization": "Bearer s3cret"}
    )
    assert res.status_code == 503
    assert "fastembed" in res.json()["detail"]


def test_route_rejects_too_many_texts(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.embed._settings.ipo_ingest_token", "s3cret")
    res = client.post(
        "/embed",
        json={"texts": ["x"] * 100},
        headers={"Authorization": "Bearer s3cret"},
    )
    assert res.status_code == 422
