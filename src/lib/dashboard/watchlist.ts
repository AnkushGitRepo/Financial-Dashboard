// A small set of real NSE large-caps used to populate the Markets page
// (search suggestions, movers) and as the default demo holdings for the
// portfolio feature — replacing the earlier fictional tickers (MERFIN,
// NOVATC, etc.) per explicit instruction: no invented companies, only real
// ones the fundamentals-api can actually fetch. See ADR 0011.

export interface WatchlistEntry {
  symbol: string;
  name: string;
}

export const WATCHLIST: WatchlistEntry[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries' },
  { symbol: 'TCS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank' },
  { symbol: 'INFY', name: 'Infosys' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank' },
  { symbol: 'SBIN', name: 'State Bank of India' },
  { symbol: 'ITC', name: 'ITC' },
  { symbol: 'LT', name: 'Larsen & Toubro' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel' },
];
