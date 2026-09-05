from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://localhost/marketmitra_fundamentals"
    nse_requests_per_second: float = 3.0
    tier3_enabled: bool = True
    log_level: str = "INFO"

    # Cache freshness: how old stored data can be before a request triggers
    # re-ingestion instead of serving straight from Postgres.
    financials_cache_ttl_hours: int = 24 * 7
    prices_cache_ttl_hours: int = 4
    ratios_cache_ttl_hours: int = 24


@lru_cache
def get_settings() -> Settings:
    return Settings()
