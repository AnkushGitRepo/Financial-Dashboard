from decimal import Decimal
from pathlib import Path

from app.ingestion.pdf_financials import extract_statement_from_pdf
from app.schemas import StatementType

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "sample_annual_report.pdf"


def test_extracts_balance_sheet_line_items_from_a_ruled_table():
    pdf_bytes = FIXTURE_PATH.read_bytes()
    items = extract_statement_from_pdf(pdf_bytes, StatementType.BALANCE_SHEET)

    by_label = {i["label"]: i["value"] for i in items}
    assert by_label["Total Assets"] == Decimal(1234567)
    assert by_label["Total Equity"] == Decimal(900000)
    assert by_label["Cash and Cash Equivalents"] == Decimal(45000)


def test_returns_empty_when_statement_not_present():
    pdf_bytes = FIXTURE_PATH.read_bytes()
    items = extract_statement_from_pdf(pdf_bytes, StatementType.CASH_FLOW)
    assert items == []
