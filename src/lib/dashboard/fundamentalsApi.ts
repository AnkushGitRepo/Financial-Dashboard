// Server-side client for services/fundamentals-api (ADR 0011). Called
// directly from Server Components / route handlers — not proxied through a
// Next.js API route, since we're consuming an already-documented service,
// not shipping a new one (see docs/architecture.md → "Dashboard app shell").
// Every value here can be null/empty: the fundamentals-api's own fallback
// chain can come up short (e.g. NSE blocked, Screener markup changed), and
// callers must handle that rather than assume data always arrives.

const BASE_URL = process.env.FUNDAMENTALS_API_URL ?? 'http://localhost:8420';

export interface CompanyOut {
  symbol: string;
  name: string;
  industry: string | null;
  sector: string | null;
  source_tier: string | null;
}

export interface RatioOut {
  name: string;
  value: string | null;
  unit: string | null;
  as_of: string;
  source_tier: string;
}

export interface ShareholdingOut {
  category: string;
  percentage: string;
  quarter_end: string;
  source_tier: string;
}

export interface LineItemOut {
  label: string;
  period_type: string;
  period_end: string;
  value: string | null;
  unit: string;
  source_tier: string;
}

export interface PricePointOut {
  trade_date: string;
  open: string | null;
  high: string | null;
  low: string | null;
  close: string | null;
  volume: number | null;
  source_tier: string;
}

export interface IndexQuoteOut {
  name: string;
  value: string;
  change: string;
  change_pct: string;
  spark: number[];
}

export type StatementType = 'profit_and_loss' | 'balance_sheet' | 'cash_flow';
export type PricePeriod = '1mo' | '6mo' | '1y' | '5y';

async function getJson<T>(path: string, revalidateSeconds: number): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, { next: { revalidate: revalidateSeconds } });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // fundamentals-api unreachable (not running, network issue, etc.) —
    // callers treat null as "no data available," not a crash.
    return null;
  }
}

export function getCompany(symbol: string): Promise<CompanyOut | null> {
  return getJson<CompanyOut>(`/companies/${symbol}`, 3600);
}

export function getRatios(symbol: string): Promise<RatioOut[] | null> {
  return getJson<RatioOut[]>(`/companies/${symbol}/ratios`, 3600);
}

export function getShareholding(symbol: string): Promise<ShareholdingOut[] | null> {
  return getJson<ShareholdingOut[]>(`/companies/${symbol}/shareholding`, 3600);
}

export function getFinancials(symbol: string, statementType: StatementType): Promise<LineItemOut[] | null> {
  return getJson<LineItemOut[]>(`/companies/${symbol}/financials/${statementType}`, 3600 * 6);
}

export function getPrices(symbol: string, period: PricePeriod): Promise<PricePointOut[] | null> {
  return getJson<PricePointOut[]>(`/companies/${symbol}/prices?period=${period}`, 900);
}

export function getIndices(): Promise<IndexQuoteOut[] | null> {
  return getJson<IndexQuoteOut[]>('/indices', 300);
}

export interface SearchResultOut {
  type: 'company' | 'index';
  symbol: string;
  name: string;
}

export async function searchSymbols(query: string): Promise<SearchResultOut[]> {
  // No caching: search results must reflect the live query string.
  try {
    const response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
    if (!response.ok) return [];
    return (await response.json()) as SearchResultOut[];
  } catch {
    return [];
  }
}
