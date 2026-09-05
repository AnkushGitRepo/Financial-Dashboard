from decimal import Decimal
from pathlib import Path

from app.ingestion.xbrl_parser import extract_facts, map_facts_to_line_items
from app.schemas import StatementType

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "sample_xbrl_result.xml"


def test_extract_facts_reads_tagged_numeric_facts():
    xml_bytes = FIXTURE_PATH.read_bytes()
    facts = extract_facts(xml_bytes)

    assert facts["RevenueFromOperations"] == Decimal(2385000000)
    assert facts["EarningsPerShareBasic"] == Decimal("17.35")
    assert "SomeFutureTaxonomyTagWeDontMapYet" in facts


def test_map_facts_splits_recognized_from_raw():
    xml_bytes = FIXTURE_PATH.read_bytes()
    facts = extract_facts(xml_bytes)
    line_items, raw_tags = map_facts_to_line_items(facts)

    revenue_items = [i for i in line_items if i["label"] == "Revenue from Operations"]
    assert len(revenue_items) == 1
    assert revenue_items[0]["statement_type"] == StatementType.PROFIT_AND_LOSS
    assert revenue_items[0]["value"] == Decimal(2385000000)

    assert "SomeFutureTaxonomyTagWeDontMapYet" in raw_tags
    assert all(item["label"] != "SomeFutureTaxonomyTagWeDontMapYet" for item in line_items)


def test_unrecognized_tags_are_never_silently_dropped():
    xml_bytes = FIXTURE_PATH.read_bytes()
    facts = extract_facts(xml_bytes)
    line_items, raw_tags = map_facts_to_line_items(facts)

    mapped_tag_count = len(facts) - len(raw_tags)
    assert mapped_tag_count == len(line_items)
