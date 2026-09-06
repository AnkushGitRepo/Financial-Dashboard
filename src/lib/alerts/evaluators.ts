// Pure alert logic (ADR 0014 §1, §5) — no I/O, no dates from the ambient
// clock except where passed in. Every function here is table-testable.

import type {
  Alert,
  EvalResult,
  MarketSnapshot,
  PercentMoveParams,
  PortfolioMetrics,
  PortfolioPnlParams,
  PriceThresholdParams,
  Week52BreachParams,
} from './types';

function crosses(observed: number, direction: 'above' | 'below', threshold: number): boolean {
  return direction === 'above' ? observed >= threshold : observed <= threshold;
}

export function evaluatePriceThreshold(
  params: PriceThresholdParams,
  snap: MarketSnapshot
): EvalResult {
  return {
    triggered: crosses(snap.price, params.direction, params.threshold),
    observedValue: snap.price,
  };
}

/** Returns null when there's no previous close to measure against — the
 * caller must skip, not treat it as "not triggered". */
export function evaluatePercentMove(
  params: PercentMoveParams,
  snap: MarketSnapshot
): EvalResult | null {
  if (snap.changePct === null || Number.isNaN(snap.changePct)) return null;
  const move = snap.changePct;
  const magnitude = Math.abs(params.pct);
  let triggered: boolean;
  if (params.direction === 'up') triggered = move >= magnitude;
  else if (params.direction === 'down') triggered = move <= -magnitude;
  else triggered = Math.abs(move) >= magnitude;
  return { triggered, observedValue: move };
}

/** Returns null when the relevant 52-week extreme is unknown. */
export function evaluate52WeekBreach(
  params: Week52BreachParams,
  snap: MarketSnapshot
): EvalResult | null {
  const within = Math.max(0, params.withinPct ?? 0);
  if (params.edge === 'high') {
    if (snap.week52High === null) return null;
    const trigger = snap.week52High * (1 - within / 100);
    return { triggered: snap.price >= trigger, observedValue: snap.price };
  }
  if (snap.week52Low === null) return null;
  const trigger = snap.week52Low * (1 + within / 100);
  return { triggered: snap.price <= trigger, observedValue: snap.price };
}

export function evaluatePortfolioPnl(
  params: PortfolioPnlParams,
  metrics: PortfolioMetrics
): EvalResult {
  const observed =
    params.metric === 'total_value'
      ? metrics.totalValue
      : params.metric === 'unrealized_pnl'
        ? metrics.unrealizedPnl
        : metrics.unrealizedPnlPct;
  return { triggered: crosses(observed, params.direction, params.threshold), observedValue: observed };
}

export interface AlertTransition {
  /** Send a notification this cycle. */
  notify: boolean;
  /** Field updates to persist on the alert. Always includes
   * `lastEvaluatedAt` and `lastObservedValue`. */
  patch: Partial<
    Pick<
      Alert,
      | 'status'
      | 'armed'
      | 'cooldownUntil'
      | 'triggeredAt'
      | 'lastEvaluatedAt'
      | 'lastObservedValue'
      | 'updatedAt'
    >
  >;
}

/**
 * Given an alert, this cycle's evaluation, and `now`, decide whether to
 * notify and how the alert's state changes.
 *
 * - Non-rearm alert: fires once, then `status → 'triggered'` and stops.
 * - Rearm alert: fires, sets a cooldown, and disarms; re-arms only once
 *   the condition has gone false again *and* the cooldown has elapsed
 *   (hysteresis — a price hovering on the line doesn't spam).
 * - A null `result` (couldn't evaluate — missing upstream data) is a
 *   no-op beyond stamping `lastEvaluatedAt`.
 */
export function decideAlertTransition(
  alert: Pick<Alert, 'status' | 'rearm' | 'cooldownMinutes' | 'armed' | 'cooldownUntil'>,
  result: EvalResult | null,
  now: Date
): AlertTransition {
  const patch: AlertTransition['patch'] = { lastEvaluatedAt: now, updatedAt: now };

  if (result === null || alert.status !== 'active') {
    return { notify: false, patch };
  }

  patch.lastObservedValue = result.observedValue;
  const cooldownElapsed = alert.cooldownUntil === null || now >= alert.cooldownUntil;

  if (!result.triggered) {
    // Condition is false: re-arm a disarmed alert once its cooldown is up.
    if (alert.rearm && !alert.armed && cooldownElapsed) {
      patch.armed = true;
      patch.cooldownUntil = null;
    }
    return { notify: false, patch };
  }

  // Condition is true.
  if (!alert.rearm) {
    patch.status = 'triggered';
    patch.triggeredAt = now;
    return { notify: true, patch };
  }

  if (alert.armed && cooldownElapsed) {
    patch.armed = false;
    patch.triggeredAt = now;
    patch.cooldownUntil = new Date(now.getTime() + alert.cooldownMinutes * 60_000);
    return { notify: true, patch };
  }

  return { notify: false, patch };
}

/** Shape fundamentals-api's `GET /quote` string fields into a numeric
 * snapshot. Returns null if there's no usable last price. */
export function snapshotFromQuote(quote: {
  price: string | null;
  prev_close: string | null;
  change_pct: string | null;
  week52_high: string | null;
  week52_low: string | null;
}): MarketSnapshot | null {
  const price = quote.price === null ? NaN : Number(quote.price);
  if (!Number.isFinite(price)) return null;
  const num = (v: string | null): number | null => {
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    price,
    prevClose: num(quote.prev_close),
    changePct: num(quote.change_pct),
    week52High: num(quote.week52_high),
    week52Low: num(quote.week52_low),
  };
}
