from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas import (
    FinancialLineItem,
    PeriodType,
    Ratio,
    ShareholdingEntry,
    SourceTier,
    StatementType,
)


def test_financial_line_item_requires_source_tier():
    with pytest.raises(ValidationError):
        FinancialLineItem(
            company_id=1,
            statement_type=StatementType.PROFIT_AND_LOSS,
            period_type=PeriodType.ANNUAL,
            period_end=date(2024, 3, 31),
            label="Sales",
            value=Decimal(100),
        )


def test_financial_line_item_accepts_valid_data():
    item = FinancialLineItem(
        company_id=1,
        statement_type=StatementType.PROFIT_AND_LOSS,
        period_type=PeriodType.ANNUAL,
        period_end=date(2024, 3, 31),
        label="Sales",
        value=Decimal("100.50"),
        source_tier=SourceTier.TIER3_SCREENER,
    )
    assert item.unit == "INR_CR"
    assert item.source_tier == SourceTier.TIER3_SCREENER


def test_ratio_value_can_be_none_but_name_is_required():
    ratio = Ratio(
        company_id=1, name="Stock P/E", as_of=date.today(), source_tier=SourceTier.TIER3_SCREENER
    )
    assert ratio.value is None


def test_shareholding_entry_requires_percentage():
    with pytest.raises(ValidationError):
        ShareholdingEntry(
            company_id=1,
            category="Promoters",
            quarter_end=date.today(),
            source_tier=SourceTier.TIER1_NSE_BSE,
        )


def test_source_tier_is_a_string_enum_serializable_to_json():
    assert SourceTier.TIER1_NSE_BSE.value == "tier1_nse_bse"
    ratio = Ratio(
        company_id=1,
        name="ROCE",
        value=Decimal("25.0"),
        unit="%",
        as_of=date.today(),
        source_tier=SourceTier.TIER3_SCREENER,
    )
    dumped = ratio.model_dump(mode="json")
    assert dumped["source_tier"] == "tier3_screener"
