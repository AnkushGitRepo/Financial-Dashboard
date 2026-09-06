// Pure IPO alert logic (ADR 0017). No I/O. `today` is an IST 'YYYY-MM-DD'
// string; IPO dates from fundamentals-api are date-only ISO strings.

import type { Ipo } from '@/lib/dashboard/iposApi';
import type { EvalResult, IpoAlertParams, IpoTrigger, IpoWatchParams } from './types';

const _IST_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 'YYYY-MM-DD' for the given instant in IST (IPO calendars are IST). */
export function istToday(now: Date = new Date()): string {
  return _IST_FMT.format(now);
}

function crossesGmp(ipo: Ipo, pct: number | undefined, abs: number | undefined): boolean {
  if (pct !== undefined && ipo.gmp_pct !== null) return Math.abs(ipo.gmp_pct) >= pct;
  if (abs !== undefined && ipo.gmp !== null) return Math.abs(ipo.gmp) >= abs;
  return false;
}

/**
 * A per-IPO alert (set from a row on the IPO page). Date triggers fire on
 * the day itself; `gmp_threshold` is a crossing check. Returns null when
 * the IPO isn't in the current list or the relevant date is unknown —
 * caller must skip, never fire.
 */
export function evaluateIpoAlert(
  params: IpoAlertParams,
  ipo: Ipo | undefined,
  today: string
): EvalResult | null {
  if (!ipo) return null;

  switch (params.trigger) {
    case 'opens':
      return ipo.open_date ? { triggered: ipo.open_date === today, observedValue: 0 } : null;
    case 'last_day':
      return ipo.close_date ? { triggered: ipo.close_date === today, observedValue: 0 } : null;
    case 'allotment_listing': {
      const hit =
        (ipo.allotment_date !== null && ipo.allotment_date === today) ||
        (ipo.listing_date !== null && ipo.listing_date === today);
      return ipo.allotment_date || ipo.listing_date ? { triggered: hit, observedValue: 0 } : null;
    }
    case 'gmp_threshold': {
      const observed = ipo.gmp_pct ?? ipo.gmp;
      if (observed === null) return null;
      return {
        triggered: crossesGmp(ipo, params.gmpThresholdPct, params.gmpThresholdAbs),
        observedValue: observed,
      };
    }
  }
}

export interface IpoWatchHit {
  /** `"<slug>:<subkey>"` — the idempotency key. */
  key: string;
  ipo: Ipo;
  /** What fired: 'opens' | 'last_day' | 'allotment' | 'listing' | 'gmp'. */
  kind: 'opens' | 'last_day' | 'allotment' | 'listing' | 'gmp';
}

/**
 * The user's single standing IPO-watch subscription, evaluated against the
 * whole current IPO list. Returns the hits to notify (those whose key
 * isn't already in `sentKeys`) plus the pruned key set to persist (drops
 * keys for IPOs no longer in the list).
 */
export function evaluateIpoWatch(
  params: IpoWatchParams,
  ipos: Ipo[],
  sentKeys: string[],
  today: string
): { hits: IpoWatchHit[]; keptKeys: string[] } {
  const sent = new Set(sentKeys);
  const liveSlugs = new Set(ipos.map((i) => i.slug));
  const keptKeys = sentKeys.filter((k) => liveSlugs.has(k.split(':')[0]));

  const hits: IpoWatchHit[] = [];
  const consider = (key: string, ipo: Ipo, kind: IpoWatchHit['kind']) => {
    if (!sent.has(key)) {
      hits.push({ key, ipo, kind });
      keptKeys.push(key);
    }
  };

  for (const ipo of ipos) {
    if (params.ipoType === 'mainboard' && ipo.category === 'sme') continue;

    if (params.triggers.opens && ipo.open_date === today) {
      consider(`${ipo.slug}:opens`, ipo, 'opens');
    }
    if (params.triggers.lastDay && ipo.close_date === today) {
      consider(`${ipo.slug}:last_day`, ipo, 'last_day');
    }
    if (params.triggers.allotmentListing) {
      if (ipo.allotment_date === today) consider(`${ipo.slug}:allotment`, ipo, 'allotment');
      if (ipo.listing_date === today) consider(`${ipo.slug}:listing`, ipo, 'listing');
    }
    if (params.gmpThresholdPct !== undefined && crossesGmp(ipo, params.gmpThresholdPct, undefined)) {
      consider(`${ipo.slug}:gmp`, ipo, 'gmp');
    }
  }

  return { hits, keptKeys };
}

/** Human labels for a per-IPO trigger, for notification copy. */
export const IPO_TRIGGER_LABELS: Record<IpoTrigger, string> = {
  opens: 'opens for subscription',
  last_day: 'closes today — last day to apply',
  allotment_listing: 'allotment / listing day',
  gmp_threshold: 'grey-market premium crossed your threshold',
};
