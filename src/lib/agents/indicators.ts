// Lightweight technical indicators for the Phase 11 "technical analyst"
// agent (ADR 0021). Pure numeric functions over a close-price series
// (oldest first). No charting, no trading logic — the analyst prompt is
// handed a plain description of these, not a signal.

/** Simple moving average of the last `period` values, or `null` if short. */
export function sma(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/** Exponential moving average (last value), seeded with the SMA of the
 *  first `period` points. `null` if the series is shorter than `period`. */
export function ema(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i += 1) {
    e = values[i] * k + e * (1 - k);
  }
  return e;
}

/** Wilder's RSI (last value), 0–100. `null` if fewer than `period + 1`
 *  points. */
export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < values.length; i += 1) {
    const d = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Largest peak-to-trough decline over the series, as a positive fraction
 *  (0.25 = a 25% drawdown). */
export function maxDrawdown(values: number[]): number {
  if (values.length < 2) return 0;
  let peak = values[0];
  let worst = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    if (peak > 0) worst = Math.max(worst, (peak - v) / peak);
  }
  return worst;
}

export type MaCross = 'golden' | 'death' | 'none';

/** Whether the short MA has crossed the long MA within the last
 *  `lookback` points ('golden' = up through, 'death' = down through). */
export function maCross(
  closes: number[],
  shortPeriod = 20,
  longPeriod = 50,
  lookback = 5
): MaCross {
  if (closes.length < longPeriod + lookback) return 'none';
  const rel = (endOffset: number): number | null => {
    const s = sma(closes.slice(0, closes.length - endOffset), shortPeriod);
    const l = sma(closes.slice(0, closes.length - endOffset), longPeriod);
    if (s === null || l === null) return null;
    return Math.sign(s - l);
  };
  const now = rel(0);
  for (let back = 1; back <= lookback; back += 1) {
    const then = rel(back);
    if (now !== null && then !== null && now !== then) {
      return now > then ? 'golden' : 'death';
    }
  }
  return 'none';
}

export interface TechnicalSummary {
  lastClose: number | null;
  sma20: number | null;
  sma50: number | null;
  ema20: number | null;
  rsi14: number | null;
  maxDrawdownPct: number | null;
  cross: MaCross;
  /** Last close vs. 20/50-day SMA and the ~period return. */
  aboveSma20: boolean | null;
  aboveSma50: boolean | null;
  periodReturnPct: number | null;
  points: number;
}

/** Roll the indicators up into one structured object for the analyst
 *  context builder to render as prose. */
export function summariseTechnicals(closes: number[]): TechnicalSummary {
  const clean = closes.filter((c) => Number.isFinite(c) && c > 0);
  const last = clean.at(-1) ?? null;
  const s20 = sma(clean, 20);
  const s50 = sma(clean, 50);
  return {
    lastClose: last,
    sma20: s20,
    sma50: s50,
    ema20: ema(clean, 20),
    rsi14: rsi(clean, 14),
    maxDrawdownPct: clean.length >= 2 ? maxDrawdown(clean) * 100 : null,
    cross: maCross(clean),
    aboveSma20: last !== null && s20 !== null ? last > s20 : null,
    aboveSma50: last !== null && s50 !== null ? last > s50 : null,
    periodReturnPct:
      clean.length >= 2 && clean[0] > 0 ? ((last! - clean[0]) / clean[0]) * 100 : null,
    points: clean.length,
  };
}
