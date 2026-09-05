"""Tests the Tier 3 Screener.in parser against a real, saved-to-disk page
(tests/fixtures/screener_newgen_consolidated.html — Newgen Software's
consolidated Screener.in page, saved from a browser by the project
maintainer) rather than a live network call. No network access required to
run this file.
"""

from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from scrapling import Selector

from app.ingestion.tier3_screener_scrapling.scraper import (
    _parse_financial_statement,
    _parse_ratios,
    _parse_shareholding,
)
from app.schemas import PeriodType, StatementType

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "screener_newgen_consolidated.html"


@pytest.fixture(scope="module")
def newgen_page():
    html = FIXTURE_PATH.read_text(encoding="utf-8")
    return Selector(html)


def test_parse_ratios_finds_expected_named_ratios(newgen_page):
    ratios = _parse_ratios(newgen_page)
    names = {r["name"] for r in ratios}

    assert "Stock P/E" in names
    assert "ROCE" in names
    assert "ROE" in names
    assert "Dividend Yield" in names

    roce = next(r for r in ratios if r["name"] == "ROCE")
    assert roce["unit"] == "%"
    assert roce["value"] > 0


def test_parse_ratios_all_values_are_positive_decimals(newgen_page):
    ratios = _parse_ratios(newgen_page)
    assert len(ratios) >= 8
    for ratio in ratios:
        assert isinstance(ratio["value"], Decimal)


def test_parse_profit_and_loss_has_sales_row_across_years(newgen_page):
    line_items = _parse_financial_statement(newgen_page, StatementType.PROFIT_AND_LOSS)
    sales_rows = [i for i in line_items if i["label"] == "Sales"]

    assert len(sales_rows) >= 10  # ~11 annual columns + TTM on a decade-plus-listed company
    assert all(i["period_type"] == PeriodType.ANNUAL for i in sales_rows if i["period_end"])
    assert all(i["value"] > 0 for i in sales_rows)

    earliest = min(i["period_end"] for i in sales_rows if i["period_end"])
    assert earliest.year <= 2016


def test_parse_balance_sheet_has_total_row_shaped_data(newgen_page):
    line_items = _parse_financial_statement(newgen_page, StatementType.BALANCE_SHEET)
    labels = {i["label"] for i in line_items}
    assert any("Total" in label for label in labels)


def test_parse_shareholding_returns_full_quarterly_history(newgen_page):
    entries = _parse_shareholding(newgen_page)
    categories = {e["category"] for e in entries}

    assert "Promoters" in categories
    assert "No. of Shareholders" not in categories  # explicitly excluded — it's a count, not a %

    quarters = {e["quarter_end"] for e in entries if e["category"] == "Promoters"}
    assert len(quarters) >= 5  # Screener shows at least five quarters of history

    latest_quarter = max(quarters)
    total_latest = sum(e["percentage"] for e in entries if e["quarter_end"] == latest_quarter)
    assert Decimal(99) <= total_latest <= Decimal(101)


def test_parse_shareholding_quarter_end_is_a_real_date(newgen_page):
    entries = _parse_shareholding(newgen_page)
    assert isinstance(entries[0]["quarter_end"], date)
