from functools import lru_cache
from urllib.parse import urlsplit, urlunsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _normalize_database_url(raw: str) -> str:
    """Neon/Vercel hand out plain `postgresql://` URLs with libpq-only query
    params (`channel_binding`, `sslmode`, `connect_timeout`) that asyncpg's
    connect() rejects outright as unknown keyword arguments. Force the
    asyncpg driver and drop the query string entirely — Neon enforces TLS
    server-side regardless, and asyncpg negotiates it automatically without
    needing any of those params spelled out."""
    parts = urlsplit(raw)
    scheme = parts.scheme
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+asyncpg"
    return urlunsplit((scheme, parts.netloc, parts.path, "", ""))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://localhost/marketmitra_fundamentals"

    @field_validator("database_url")
    @classmethod
    def _validate_database_url(cls, value: str) -> str:
        return _normalize_database_url(value)
    nse_requests_per_second: float = 3.0
    tier3_enabled: bool = True
    log_level: str = "INFO"

    # Cache freshness: how old stored data can be before a request triggers
    # re-ingestion instead of serving straight from Postgres.
    financials_cache_ttl_hours: int = 24 * 7
    prices_cache_ttl_hours: int = 4
    ratios_cache_ttl_hours: int = 24

    # Live-quote endpoint (GET /quote) — in-process TTL so the alert cron and
    # any dashboard caller share one upstream yfinance hit. Seconds, not hours.
    quote_cache_ttl_seconds: int = 60

    # News feed (GET /news, ADR 0015). Lazy refresh-on-read: a read re-fetches
    # only when the newest relevant item is older than the TTL. Broad market
    # feeds move slower than per-company Google News queries.
    news_broad_cache_ttl_minutes: int = 30
    news_symbol_cache_ttl_minutes: int = 60
    news_retention_days: int = 30

    # IPO tracker (GET /ipos, ADR 0017). Lazy TTL: a read past this re-fetches
    # (best-effort — the aggregator is a SPA, so the reliable path is an
    # out-of-band job POSTing to /ipos/ingest). Listed IPOs are pruned after
    # `ipo_listed_retention_days`.
    ipo_cache_ttl_minutes: int = 60
    ipo_listed_retention_days: int = 30
    # Shared secret for POST /ipos/ingest (the headless-browser refresh job).
    ipo_ingest_token: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
