from datetime import date
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.api import deps
from app.db.models import CompanyORM, RatioORM
from app.main import app


async def _fake_resolve_company(symbol: str, _session=None):
    return CompanyORM(
        id=1,
        nse_symbol=symbol,
        name="Reliance Industries Limited",
        industry="Oil & Gas Refining & Marketing",
        sector="Energy",
        source_tier="tier2_yfinance",
    )


@pytest.fixture
def client():
    async def fake_get_db():
        yield None

    app.dependency_overrides[deps.get_db] = fake_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_company(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.companies.resolve_company", _fake_resolve_company)

    response = client.get("/companies/RELIANCE")
    assert response.status_code == 200
    body = response.json()
    assert body["symbol"] == "RELIANCE"
    assert body["name"] == "Reliance Industries Limited"
    assert body["source_tier"] == "tier2_yfinance"


def test_get_company_ratios_includes_source_tier(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.companies.resolve_company", _fake_resolve_company)

    async def fake_get_ratios(session, company):
        return [
            RatioORM(
                company_id=1,
                name="Stock P/E",
                value=Decimal("24.0"),
                unit=None,
                as_of=date.today(),
                source_tier="tier3_screener",
            )
        ]

    monkeypatch.setattr("app.api.routes.companies.svc.get_ratios", fake_get_ratios)

    response = client.get("/companies/RELIANCE/ratios")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["name"] == "Stock P/E"
    assert body[0]["source_tier"] == "tier3_screener"


def test_invalid_statement_type_returns_422(client, monkeypatch):
    monkeypatch.setattr("app.api.routes.financials.resolve_company", _fake_resolve_company)

    response = client.get("/companies/RELIANCE/financials/not_a_real_statement")
    assert response.status_code == 422
