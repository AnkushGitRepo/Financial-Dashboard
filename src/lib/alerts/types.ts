// Phase 5 alerts — shared types (ADR 0014).

export type AlertType = 'price_threshold' | 'percent_move' | 'week52_breach' | 'portfolio_pnl';

export type AlertStatus = 'active' | 'triggered' | 'paused';

/** Notify when the last price crosses a set level. Target-price and
 * stop-loss are the same thing with a different `direction`. */
export interface PriceThresholdParams {
  direction: 'above' | 'below';
  threshold: number;
}

/** Notify on an intraday move from the previous close. */
export interface PercentMoveParams {
  direction: 'up' | 'down' | 'either';
  pct: number; // magnitude, always positive (e.g. 5 means ±5%)
}

/** Notify on a new 52-week high/low, or coming within `withinPct` of one
 * (0 / omitted = an actual breach). */
export interface Week52BreachParams {
  edge: 'high' | 'low';
  withinPct?: number;
}

/** Notify when a portfolio-level figure crosses a set level. `symbol`
 * (optional) scopes it to one holding instead of the whole book. */
export interface PortfolioPnlParams {
  metric: 'total_value' | 'unrealized_pnl' | 'unrealized_pnl_pct';
  direction: 'above' | 'below';
  threshold: number;
}

export type AlertParams =
  | ({ type: 'price_threshold' } & PriceThresholdParams)
  | ({ type: 'percent_move' } & PercentMoveParams)
  | ({ type: 'week52_breach' } & Week52BreachParams)
  | ({ type: 'portfolio_pnl' } & PortfolioPnlParams);

export interface Alert {
  id: string;
  userId: string;
  type: AlertType;
  /** Present for price_threshold / percent_move / week52_breach, and for a
   * holding-scoped portfolio_pnl. Absent for a whole-book portfolio_pnl. */
  symbol: string | null;
  params: Omit<AlertParams, 'type'>;
  note: string | null;
  status: AlertStatus;
  /** When true the alert re-arms after firing (subject to cooldown +
   * hysteresis) instead of going one-shot to `triggered`. */
  rearm: boolean;
  cooldownMinutes: number;
  /** Internal re-arm gate: false between a fire and the condition next
   * going false past its cooldown. Meaningless for non-rearm alerts. */
  armed: boolean;
  cooldownUntil: Date | null;
  lastEvaluatedAt: Date | null;
  triggeredAt: Date | null;
  lastObservedValue: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The market data one evaluation needs for a single symbol — shaped from
 * fundamentals-api's `GET /quote`. */
export interface MarketSnapshot {
  price: number;
  prevClose: number | null;
  changePct: number | null;
  week52High: number | null;
  week52Low: number | null;
}

/** Portfolio figures the cron computes by joining holdings + quotes. */
export interface PortfolioMetrics {
  totalValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

export interface EvalResult {
  /** True when the alert's condition is currently satisfied. */
  triggered: boolean;
  /** The number the condition was checked against (for display + storage). */
  observedValue: number;
}
