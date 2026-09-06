"""Sentence embeddings for MarketMitra's Phase 10 retrieval (ADR 0020).

The main app can't run ONNX-backed embeddings in its own serverless runtime
(`onnxruntime-node` can't load `libonnxruntime.so.1` on Vercel), so it POSTs
text here and this service embeds it with `fastembed` — a small
onnxruntime-CPU wrapper that works fine in Vercel's Python runtime.

Model: `BAAI/bge-small-en-v1.5` (384-dim, quantised ONNX ~64 MB). Vectors
come back L2-normalised, so a dot product is cosine similarity — what the
Atlas Vector Search index is configured for. The dimension MUST stay 384
to match `EMBED_DIM` on the Next side and the index definition.

`fastembed` is imported lazily so a self-host that trims it degrades to a
clear error instead of failing app startup.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from app.config import get_settings

logger = logging.getLogger("fundamentals.embeddings")

EMBED_DIM = 384


class EmbeddingError(RuntimeError):
    """Model unavailable or embedding failed."""


@lru_cache(maxsize=1)
def _model():
    try:
        from fastembed import TextEmbedding
    except ModuleNotFoundError as exc:  # pragma: no cover - only when trimmed
        raise EmbeddingError("fastembed is not installed") from exc

    settings = get_settings()
    logger.info(
        "loading embedding model %s (cache_dir=%s)",
        settings.embed_model,
        settings.fastembed_cache_dir,
    )
    try:
        return TextEmbedding(
            model_name=settings.embed_model,
            cache_dir=settings.fastembed_cache_dir or None,
        )
    except Exception as exc:
        logger.exception("failed to construct TextEmbedding")
        raise EmbeddingError(f"model load failed: {exc!r}") from exc


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed each string to a 384-float unit vector, in order. An empty
    list returns `[]` without loading the model."""
    if not texts:
        return []
    try:
        model = _model()
        vectors = [vec.tolist() for vec in model.embed(texts)]
    except EmbeddingError:
        raise
    except Exception as exc:  # surface any fastembed / onnx failure
        logger.exception("embedding failed")
        raise EmbeddingError(f"embedding failed: {exc!r}") from exc

    if vectors and len(vectors[0]) != EMBED_DIM:
        raise EmbeddingError(
            f"model returned dim {len(vectors[0])}, expected {EMBED_DIM}"
        )
    return vectors
