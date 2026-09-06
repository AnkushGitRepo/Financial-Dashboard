"""Offline tests for GET /quote and the ingestion.quotes helpers — the
yfinance call (`_raw_fast_info`) is monkeypatched, nothing hits the network.
"""

import pytest
from fastapi.testclient import TestClient

from app.ingestion import quotes
from app.main import app


@pytest.fixture(autouse=True)
def _clear_quote_cache():
    quotes._clear_cache()
    yield
    quotes._clear_cache()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def _fake_fast_info(**overrides):
    base = {
        "lastPrice": 1400.0,
        "previousClose": 1350.0,
        "yearHigh": 1600.0,
        "yearLow": 1100.0,
    }
    base.update(overrides)
    return base


def test_quote_batch_shapes_and_change_pct(client, monkeypatch):
    calls: list[str] = []

    def fake_raw(yahoo_symbol: str) -> dict:
        calls.append(yahoo_symbol)
        return _fake_fast_info()

    monkeypatch.setattr(quotes, "_raw_fast_info", fake_raw)

    response = client.get("/quote", params={"symbols": "RELIANCE,TCS"})
    assert response.status_code == 200
    body = response.json()
    assert [q["symbol"] for q in body] == ["RELIANCE", "TCS"]
    assert calls == ["RELIANCE.NS", "TCS.NS"]

    first = body[0]
    assert first["price"] == "1400.0"
    assert first["prev_close"] == "1350.0"
    # (1400 - 1350) / 1350 * 100
    assert first["change_pct"].startswith("3.7037")
    assert first["week52_high"] == "1600.0"
    assert first["week52_low"] == "1100.0"
    assert first["source_tier"] == "tier2_yfinance"
    assert first["as_of"].endswith("+00:00")


def test_quote_index_name_resolves_to_caret_ticker(client, monkeypatch):
    seen: list[str] = []

    def fake_raw(yahoo_symbol: str) -> dict:
        seen.append(yahoo_symbol)
        return _fake_fast_info()

    monkeypatch.setattr(quotes, "_raw_fast_info", fake_raw)

    response = client.get("/quote", params={"symbols": "NIFTY 50"})
    assert response.status_code == 200
    assert seen == ["^NSEI"]
    assert response.json()[0]["symbol"] == "NIFTY 50"


def test_quote_dedupes_and_is_cached(client, monkeypatch):
    calls: list[str] = []

    def fake_raw(yahoo_symbol: str) -> dict:
        calls.append(yahoo_symbol)
        return _fake_fast_info()

    monkeypatch.setattr(quotes, "_raw_fast_info", fake_raw)

    client.get("/quote", params={"symbols": "RELIANCE,reliance , RELIANCE"})
    client.get("/quote", params={"symbols": "RELIANCE"})

    # Deduped within the first request, and the TTL cache absorbs the second.
    assert calls == ["RELIANCE.NS"]


def test_quote_skips_failed_and_priceless_symbols(client, monkeypatch):
    def fake_raw(yahoo_symbol: str) -> dict:
        if yahoo_symbol == "BOOM.NS":
            raise RuntimeError("upstream 503")
        if yahoo_symbol == "NOPRICE.NS":
            return _fake_fast_info(lastPrice=None)
        return _fake_fast_info()

    monkeypatch.setattr(quotes, "_raw_fast_info", fake_raw)

    response = client.get("/quote", params={"symbols": "RELIANCE,BOOM,NOPRICE"})
    assert response.status_code == 200
    assert [q["symbol"] for q in response.json()] == ["RELIANCE"]


def test_quote_missing_prev_close_gives_null_change_pct(client, monkeypatch):
    monkeypatch.setattr(
        quotes, "_raw_fast_info", lambda _s: _fake_fast_info(previousClose=None)
    )
    response = client.get("/quote", params={"symbols": "RELIANCE"})
    assert response.status_code == 200
    body = response.json()[0]
    assert body["prev_close"] is None
    assert body["change_pct"] is None


def test_quote_requires_symbols_param(client):
    assert client.get("/quote").status_code == 422
    assert client.get("/quote", params={"symbols": " , "}).json() == []
