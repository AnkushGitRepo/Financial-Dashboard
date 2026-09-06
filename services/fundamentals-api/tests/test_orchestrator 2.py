import pytest

from app.ingestion.orchestrator import TieredResolver, resolve_with_fallback
from app.schemas import SourceTier


@pytest.mark.asyncio
async def test_tier1_serves_everything_tier2_and_3_are_never_called():
    calls = {"tier2": 0, "tier3": 0}

    async def tier1():
        return {"a": 1, "b": 2}

    async def tier2():
        calls["tier2"] += 1
        return {"a": 999}

    async def tier3():
        calls["tier3"] += 1
        return {"a": 999}

    result = await resolve_with_fallback(
        {"a", "b"},
        [
            TieredResolver(SourceTier.TIER1_NSE_BSE, tier1),
            TieredResolver(SourceTier.TIER2_YFINANCE, tier2),
            TieredResolver(SourceTier.TIER3_SCREENER, tier3),
        ],
    )

    assert result.values == {"a": 1, "b": 2}
    assert result.tier_for("a") == SourceTier.TIER1_NSE_BSE
    assert calls == {"tier2": 0, "tier3": 0}


@pytest.mark.asyncio
async def test_falls_through_per_field_not_per_tier():
    async def tier1():
        return {"a": 1}  # doesn't have "b"

    async def tier2():
        return {"b": 2}  # doesn't have "a" — shouldn't overwrite it anyway

    result = await resolve_with_fallback(
        {"a", "b"},
        [
            TieredResolver(SourceTier.TIER1_NSE_BSE, tier1),
            TieredResolver(SourceTier.TIER2_YFINANCE, tier2),
        ],
    )

    assert result.values == {"a": 1, "b": 2}
    assert result.tier_for("a") == SourceTier.TIER1_NSE_BSE
    assert result.tier_for("b") == SourceTier.TIER2_YFINANCE


@pytest.mark.asyncio
async def test_a_broken_tier_does_not_break_the_chain():
    async def tier1():
        raise RuntimeError("NSE blocked us")

    async def tier2():
        return {"a": 1}

    result = await resolve_with_fallback(
        {"a"},
        [
            TieredResolver(SourceTier.TIER1_NSE_BSE, tier1),
            TieredResolver(SourceTier.TIER2_YFINANCE, tier2),
        ],
    )

    assert result.values == {"a": 1}
    assert SourceTier.TIER1_NSE_BSE in result.errors


@pytest.mark.asyncio
async def test_unresolved_fields_are_simply_absent_not_errors():
    async def tier1():
        return {}

    result = await resolve_with_fallback(
        {"a", "b"}, [TieredResolver(SourceTier.TIER1_NSE_BSE, tier1)]
    )

    assert result.values == {}
    assert result.tier_for("a") is None


@pytest.mark.asyncio
async def test_none_values_are_treated_as_not_found():
    async def tier1():
        return {"a": None}

    async def tier2():
        return {"a": 42}

    result = await resolve_with_fallback(
        {"a"},
        [
            TieredResolver(SourceTier.TIER1_NSE_BSE, tier1),
            TieredResolver(SourceTier.TIER2_YFINANCE, tier2),
        ],
    )

    assert result.values == {"a": 42}
    assert result.tier_for("a") == SourceTier.TIER2_YFINANCE
