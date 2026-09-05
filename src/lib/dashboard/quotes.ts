import { getCompany, getPrices } from './fundamentalsApi';
import { WATCHLIST } from './watchlist';

export interface Quote {
  symbol: string;
  name: string;
  sector: string | null;
  price: number;
  change: number;
  changePct: number;
}

/** Derives a day-change quote from real daily closes (the fundamentals-api
 * has no dedicated lightweight quote endpoint) for one symbol. Returns null
 * if data wasn't available — callers must skip it, not fake it. */
export async function getQuote(symbol: string, displayName?: string): Promise<Quote | null> {
  const [company, prices] = await Promise.all([getCompany(symbol), getPrices(symbol, '1mo')]);
  const closes = (prices ?? []).filter((p) => p.close !== null).map((p) => Number(p.close));
  if (closes.length < 2) return null;

  const latest = closes[closes.length - 1];
  const previous = closes[closes.length - 2];
  const change = latest - previous;

  return {
    symbol,
    name: displayName ?? company?.name ?? symbol,
    sector: company?.sector ?? null,
    price: latest,
    change,
    changePct: previous ? (change / previous) * 100 : 0,
  };
}

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const quotes = await Promise.all(symbols.map((s) => getQuote(s)));
  return quotes.filter((q): q is Quote => q !== null);
}

export async function getWatchlistQuotes(): Promise<Quote[]> {
  const quotes = await Promise.all(WATCHLIST.map((w) => getQuote(w.symbol, w.name)));
  return quotes.filter((q): q is Quote => q !== null);
}

export async function getTopMovers(): Promise<{ gainers: Quote[]; losers: Quote[] }> {
  const quotes = await getWatchlistQuotes();
  const sorted = [...quotes].sort((a, b) => b.changePct - a.changePct);
  return {
    gainers: sorted.filter((q) => q.changePct > 0).slice(0, 5),
    losers: sorted
      .filter((q) => q.changePct < 0)
      .slice(-5)
      .reverse(),
  };
}
