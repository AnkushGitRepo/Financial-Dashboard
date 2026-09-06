"""Offline tests for the fair-use rate limiter (ADR 0019). No network: the
Upstash REST call is monkeypatched.
"""

import httpx
import pytest

from app import rate_limit
from app.config import Settings


def _settings(**over) -> Settings:
    base = {
        "upstash_redis_rest_url": "https://fake.upstash.io",
        "upstash_redis_rest_token": "tok",
        "rate_limit_per_minute": 5,
    }
    base.update(over)
    return Settings(**base)


class _FakeResp:
    def __init__(self, count: int):
        self._count = count

    def raise_for_status(self) -> None:
        pass

    def json(self):
        return [{"result": self._count}, {"result": 1}]


def _patch_post(monkeypatch, behaviour):
    async def fake_post(self, url, **kwargs):
        return behaviour(url, kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)


@pytest.mark.asyncio
async def test_passthrough_when_not_configured():
    s = _settings(upstash_redis_rest_url="", upstash_redis_rest_token="")
    assert rate_limit.is_enabled(s) is False
    r = await rate_limit.check_rate_limit("1.2.3.4", s)
    assert r.allowed is True


@pytest.mark.asyncio
async def test_allows_under_the_limit(monkeypatch):
    _patch_post(monkeypatch, lambda url, kw: _FakeResp(3))
    r = await rate_limit.check_rate_limit("1.2.3.4", _settings())
    assert r.allowed is True
    assert r.limit == 5
    assert r.remaining == 2


@pytest.mark.asyncio
async def test_blocks_over_the_limit(monkeypatch):
    _patch_post(monkeypatch, lambda url, kw: _FakeResp(6))
    r = await rate_limit.check_rate_limit("1.2.3.4", _settings())
    assert r.allowed is False
    assert r.remaining == 0
    assert 0 < r.retry_after <= 60


@pytest.mark.asyncio
async def test_fails_open_on_transport_error(monkeypatch):
    def boom(url, kw):
        raise httpx.ConnectError("upstash unreachable")

    _patch_post(monkeypatch, boom)
    r = await rate_limit.check_rate_limit("1.2.3.4", _settings())
    assert r.allowed is True


@pytest.mark.asyncio
async def test_pipeline_key_is_per_ip_and_window(monkeypatch):
    seen: dict = {}

    def capture(url, kw):
        seen["url"] = url
        seen["body"] = kw.get("json")
        return _FakeResp(1)

    _patch_post(monkeypatch, capture)
    await rate_limit.check_rate_limit("9.9.9.9", _settings())
    assert seen["url"].endswith("/pipeline")
    incr_cmd = seen["body"][0]
    assert incr_cmd[0] == "INCR"
    assert incr_cmd[1].startswith("mmf:rl:9.9.9.9:")


def test_client_ip_prefers_forwarded_first_hop():
    assert rate_limit.client_ip({"x-forwarded-for": "5.5.5.5, 10.0.0.1"}, "127.0.0.1") == "5.5.5.5"
    assert rate_limit.client_ip({}, "127.0.0.1") == "127.0.0.1"
    assert rate_limit.client_ip({}, None) == "unknown-ip"
