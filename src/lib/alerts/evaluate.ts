// The alert-evaluation cycle (ADR 0014 §3). Pulled out of the cron route
// handler so it can be invoked directly (tests, a manual admin trigger).

import { getQuotes } from '@/lib/dashboard/fundamentalsApi';
import { getIpos, type Ipo } from '@/lib/dashboard/iposApi';
import { listHoldings, type Holding } from '@/lib/holdings';
import { formatInr } from '@/lib/dashboard/format';
import { deliverNotification, resolveChannels } from '@/lib/notifications/deliver';
import type { NotificationPayload } from '@/lib/notifications/types';
import {
  decideAlertTransition,
  evaluate52WeekBreach,
  evaluatePercentMove,
  evaluatePortfolioPnl,
  evaluatePriceThreshold,
  snapshotFromQuote,
} from './evaluators';
import {
  IPO_TRIGGER_LABELS,
  evaluateIpoAlert,
  evaluateIpoWatch,
  istToday,
  type IpoWatchHit,
} from './ipoAlerts';
import { computeHoldingMetrics, computePortfolioMetrics, type PriceLookup } from './portfolioMetrics';
import { applyAlertTransition, listActiveAlerts } from './store';
import type {
  Alert,
  EvalResult,
  IpoAlertParams,
  IpoWatchParams,
  PercentMoveParams,
  PortfolioPnlParams,
  PriceThresholdParams,
  Week52BreachParams,
} from './types';

export interface EvaluateSummary {
  activeAlerts: number;
  symbolsQuoted: number;
  iposFetched: number;
  notified: number;
  skippedNoData: number;
  errors: number;
}

const EMPTY: EvaluateSummary = {
  activeAlerts: 0,
  symbolsQuoted: 0,
  iposFetched: 0,
  notified: 0,
  skippedNoData: 0,
  errors: 0,
};

export async function evaluateAlerts(now: Date = new Date()): Promise<EvaluateSummary> {
  const alerts = await listActiveAlerts();
  if (alerts.length === 0) return EMPTY;

  // Holdings for every user with a portfolio alert (loaded once per user).
  const portfolioUserIds = [
    ...new Set(alerts.filter((a) => a.type === 'portfolio_pnl').map((a) => a.userId)),
  ];
  const holdingsByUser = new Map<string, Holding[]>();
  await Promise.all(
    portfolioUserIds.map(async (uid) => {
      try {
        holdingsByUser.set(uid, await listHoldings(uid));
      } catch {
        holdingsByUser.set(uid, []);
      }
    })
  );

  // Every symbol we need a live quote for this cycle.
  const symbols = new Set<string>();
  for (const a of alerts) if (a.symbol) symbols.add(a.symbol.toUpperCase());
  for (const holds of holdingsByUser.values()) {
    for (const h of holds) symbols.add(h.symbol.toUpperCase());
  }

  const quotes = await getQuotes([...symbols]);
  const prices: PriceLookup = new Map(
    quotes.map((q) => [q.symbol.toUpperCase(), { price: q.price === null ? null : Number(q.price) }])
  );
  const quoteBySymbol = new Map(quotes.map((q) => [q.symbol.toUpperCase(), q]));

  // IPO alerts (ADR 0017) — one shared /ipos fetch per cycle.
  const hasIpoAlerts = alerts.some((a) => a.type === 'ipo' || a.type === 'ipo_watch');
  const ipos: Ipo[] = hasIpoAlerts ? await getIpos() : [];
  const ipoBySlug = new Map(ipos.map((i) => [i.slug, i]));
  const today = istToday(now);

  const summary: EvaluateSummary = {
    ...EMPTY,
    activeAlerts: alerts.length,
    symbolsQuoted: quotes.length,
    iposFetched: ipos.length,
  };

  for (const alert of alerts) {
    try {
      if (alert.type === 'ipo_watch') {
        summary.notified += await evaluateWatchAlert(alert, ipos, today);
        continue;
      }
      if (alert.type === 'ipo') {
        const p = alert.params as IpoAlertParams;
        const result = evaluateIpoAlert(p, ipoBySlug.get(p.ipoSlug), today);
        if (result === null) summary.skippedNoData += 1;
        const { notify, patch } = decideAlertTransition(alert, result, now);
        await applyAlertTransition(alert.id, patch);
        if (notify && result) {
          const channels = await resolveChannels(alert.userId);
          await deliverNotification(alert.userId, buildIpoAlertPayload(p, ipoBySlug.get(p.ipoSlug)), channels);
          summary.notified += 1;
        }
        continue;
      }

      const result = evaluateOne(alert, quoteBySymbol, prices, holdingsByUser);
      if (result === null) summary.skippedNoData += 1;

      const { notify, patch } = decideAlertTransition(alert, result, now);
      await applyAlertTransition(alert.id, patch);

      if (notify && result) {
        const payload = buildPayload(alert, result);
        const channels = await resolveChannels(alert.userId);
        await deliverNotification(alert.userId, payload, channels);
        summary.notified += 1;
      }
    } catch {
      summary.errors += 1;
    }
  }

  return summary;
}

async function evaluateWatchAlert(alert: Alert, ipos: Ipo[], today: string): Promise<number> {
  const { hits, keptKeys } = evaluateIpoWatch(
    alert.params as IpoWatchParams,
    ipos,
    alert.sentKeys ?? [],
    today
  );
  const channels = await resolveChannels(alert.userId);
  for (const hit of hits) {
    await deliverNotification(alert.userId, buildIpoWatchPayload(hit), channels);
  }
  await applyAlertTransition(alert.id, {
    sentKeys: keptKeys,
    lastEvaluatedAt: new Date(),
    updatedAt: new Date(),
  });
  return hits.length;
}

function buildIpoWatchPayload(hit: IpoWatchHit): NotificationPayload {
  const { ipo, kind } = hit;
  const gmpNote =
    ipo.gmp_pct !== null ? ` GMP ${ipo.gmp_pct >= 0 ? '+' : ''}${ipo.gmp_pct}% (unofficial)` : '';
  const line: Record<IpoWatchHit['kind'], string> = {
    opens: `${ipo.name} IPO opens for subscription today.`,
    last_day: `${ipo.name} IPO closes today — last day to apply.`,
    allotment: `${ipo.name} IPO allotment is today.`,
    listing: `${ipo.name} IPO lists today.`,
    gmp: `${ipo.name} IPO grey-market premium crossed your threshold.`,
  };
  return {
    kind: 'ipo',
    title: line[kind].replace(/\.$/, ''),
    body: `${line[kind]}${gmpNote}`,
    href: '/dashboard/ipos',
    meta: { ipoSlug: ipo.slug, watchKind: kind },
  };
}

function buildIpoAlertPayload(params: IpoAlertParams, ipo: Ipo | undefined): NotificationPayload {
  const name = ipo?.name ?? params.ipoSlug;
  const what = IPO_TRIGGER_LABELS[params.trigger];
  const gmpNote =
    params.trigger === 'gmp_threshold' && ipo?.gmp_pct != null
      ? ` — now ${ipo.gmp_pct >= 0 ? '+' : ''}${ipo.gmp_pct}% (unofficial grey-market estimate)`
      : '';
  return {
    kind: 'ipo',
    title: `${name} — ${what}`,
    body: `Your IPO alert for ${name}: ${what}${gmpNote}.`,
    href: '/dashboard/ipos',
    meta: { ipoSlug: params.ipoSlug, trigger: params.trigger },
  };
}

function evaluateOne(
  alert: Alert,
  quoteBySymbol: Map<string, { price: string | null; prev_close: string | null; change_pct: string | null; week52_high: string | null; week52_low: string | null }>,
  prices: PriceLookup,
  holdingsByUser: Map<string, Holding[]>
): EvalResult | null {
  if (alert.type === 'portfolio_pnl') {
    const params = alert.params as PortfolioPnlParams;
    const holds = holdingsByUser.get(alert.userId) ?? [];
    if (alert.symbol) {
      const held = holds.find((h) => h.symbol.toUpperCase() === alert.symbol!.toUpperCase());
      if (!held) return null;
      const metrics = computeHoldingMetrics(held, prices);
      return metrics ? evaluatePortfolioPnl(params, metrics) : null;
    }
    const metrics = computePortfolioMetrics(holds, prices);
    return metrics ? evaluatePortfolioPnl(params, metrics) : null;
  }

  // The three symbol-scoped types.
  if (!alert.symbol) return null;
  const quote = quoteBySymbol.get(alert.symbol.toUpperCase());
  if (!quote) return null;
  const snap = snapshotFromQuote(quote);
  if (!snap) return null;

  switch (alert.type) {
    case 'price_threshold':
      return evaluatePriceThreshold(alert.params as PriceThresholdParams, snap);
    case 'percent_move':
      return evaluatePercentMove(alert.params as PercentMoveParams, snap);
    case 'week52_breach':
      return evaluate52WeekBreach(alert.params as Week52BreachParams, snap);
    default:
      return null; // ipo / ipo_watch handled before this function
  }
}

function buildPayload(alert: Alert, result: EvalResult): NotificationPayload {
  const meta = { alertId: alert.id, alertType: alert.type, observedValue: result.observedValue };
  const href = alert.symbol ? `/dashboard/stock/${alert.symbol}` : '/dashboard/portfolio';
  const sym = alert.symbol ?? '';

  switch (alert.type) {
    case 'price_threshold': {
      const p = alert.params as PriceThresholdParams;
      const verb = p.direction === 'above' ? 'rose to' : 'fell to';
      return {
        kind: 'alert',
        title: `${sym} ${verb} ${formatInr(result.observedValue)}`,
        body: `Your ${p.direction === 'above' ? 'target' : 'stop-loss'} of ${formatInr(p.threshold)} on ${sym} was reached — last price ${formatInr(result.observedValue)}.`,
        href,
        meta,
      };
    }
    case 'percent_move': {
      const p = alert.params as PercentMoveParams;
      const move = result.observedValue;
      return {
        kind: 'alert',
        title: `${sym} moved ${move >= 0 ? '+' : ''}${move.toFixed(2)}% today`,
        body: `${sym} is ${move >= 0 ? 'up' : 'down'} ${Math.abs(move).toFixed(2)}% from its previous close, past your ${p.pct}% ${p.direction} threshold.`,
        href,
        meta,
      };
    }
    case 'week52_breach': {
      const p = alert.params as Week52BreachParams;
      const near = p.withinPct && p.withinPct > 0 ? ` (within ${p.withinPct}%)` : '';
      return {
        kind: 'alert',
        title: `${sym} near its 52-week ${p.edge}${near}`,
        body: `${sym} at ${formatInr(result.observedValue)} has reached its 52-week ${p.edge}${near}.`,
        href,
        meta,
      };
    }
    case 'portfolio_pnl': {
      const p = alert.params as PortfolioPnlParams;
      const scope = alert.symbol ? `${alert.symbol} position` : 'Your portfolio';
      const label =
        p.metric === 'total_value'
          ? 'value'
          : p.metric === 'unrealized_pnl'
            ? 'unrealised P&L'
            : 'unrealised P&L %';
      const shown =
        p.metric === 'unrealized_pnl_pct'
          ? `${result.observedValue.toFixed(2)}%`
          : formatInr(result.observedValue);
      return {
        kind: 'alert',
        title: `${scope} ${label} crossed ${p.direction} ${p.metric === 'unrealized_pnl_pct' ? `${p.threshold}%` : formatInr(p.threshold)}`,
        body: `${scope} ${label} is now ${shown}.`,
        href,
        meta,
      };
    }
    default:
      // ipo / ipo_watch build their own payloads (buildIpo*Payload)
      return { kind: 'alert', title: 'Alert triggered', body: '', href, meta };
  }
}
