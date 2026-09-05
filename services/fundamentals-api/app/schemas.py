"""Pydantic v2 models shared by ingestion, storage, and the API layer.

Every record that can originate from more than one tier carries a
`source_tier` field so callers can see which tier actually produced it
(ADR 0011 — three-tier free-data fallback chain).
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class SourceTier(StrEnum):
    """Which tier of the fallback chain actually produced a data point."""

    TIER1_NSE_BSE = "tier1_nse_bse"
    TIER2_YFINANCE = "tier2_yfinance"
    TIER3_SCREENER = "tier3_screener"


class Exchange(StrEnum):
    NSE = "NSE"
    BSE = "BSE"


class StatementType(StrEnum):
    PROFIT_AND_LOSS = "profit_and_loss"
    BALANCE_SHEET = "balance_sheet"
    CASH_FLOW = "cash_flow"


class PeriodType(StrEnum):
    ANNUAL = "annual"
    QUARTERLY = "quarterly"
    TTM = "ttm"


class DocumentType(StrEnum):
    ANNUAL_REPORT = "annual_report"
    QUARTERLY_RESULT = "quarterly_result"
    XBRL_FILING = "xbrl_filing"
    CORPORATE_ANNOUNCEMENT = "corporate_announcement"
    CREDIT_RATING = "credit_rating"


class Company(BaseModel):
    """A single listed company, keyed by its NSE symbol where one exists."""

    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    nse_symbol: str | None = Field(default=None, description="e.g. 'RELIANCE'")
    bse_code: str | None = Field(default=None, description="e.g. '500325'")
    isin: str | None = None
    name: str
    industry: str | None = None
    sector: str | None = None
    source_tier: SourceTier | None = None
    updated_at: datetime | None = None


class FinancialLineItem(BaseModel):
    """One line (e.g. 'Sales', 'Total Assets') for one company/period/statement."""

    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    company_id: int
    statement_type: StatementType
    period_type: PeriodType
    period_end: date
    label: str = Field(description="Line item label as reported, e.g. 'Sales', 'Net Profit'")
    value: Decimal | None = None
    unit: str = Field(default="INR_CR", description="Reporting unit, e.g. INR crore")
    source_tier: SourceTier
    fetched_at: datetime | None = None


class Ratio(BaseModel):
    """A single named ratio/metric for a company at a point in time."""

    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    company_id: int
    name: str = Field(description="e.g. 'Stock P/E', 'ROCE', 'Debt to Equity'")
    value: Decimal | None = None
    unit: str | None = Field(default=None, description="e.g. '%', 'x', 'INR'")
    as_of: date
    source_tier: SourceTier
    fetched_at: datetime | None = None


class ShareholdingEntry(BaseModel):
    """One category's shareholding percentage for a company at a quarter-end."""

    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    company_id: int
    category: str = Field(
        description="e.g. 'Promoters', 'FIIs', 'DIIs', 'Public', 'Government'"
    )
    percentage: Decimal
    quarter_end: date
    source_tier: SourceTier
    fetched_at: datetime | None = None


class PriceHistoryPoint(BaseModel):
    """One OHLCV bar for a company on a given trading day."""

    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    company_id: int
    exchange: Exchange
    trade_date: date
    open: Decimal | None = None
    high: Decimal | None = None
    low: Decimal | None = None
    close: Decimal | None = None
    volume: int | None = None
    source_tier: SourceTier
    fetched_at: datetime | None = None


class DocumentReference(BaseModel):
    """A pointer to a source document (annual report, XBRL filing, etc.)."""

    model_config = ConfigDict(from_attributes=True)

    id: int | None = None
    company_id: int
    document_type: DocumentType
    title: str
    url: str
    period_end: date | None = None
    source_tier: SourceTier
    fetched_at: datetime | None = None


class TieredValue(BaseModel):
    """Generic wrapper used inside the ingestion orchestrator: a value plus
    which tier produced it, before it's been shaped into a specific record."""

    value: object
    source_tier: SourceTier
