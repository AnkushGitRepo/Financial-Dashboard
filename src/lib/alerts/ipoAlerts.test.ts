import { describe, expect, it } from 'vitest';
import type { Ipo } from '@/lib/dashboard/iposApi';
import { evaluateIpoAlert, evaluateIpoWatch, istToday } from './ipoAlerts';
import type { IpoAlertParams, IpoWatchParams } from './types';

const ipo = (over: Partial<Ipo>): Ipo => ({
  slug: 'acme-ipo',
  name: 'Acme',
  source_url: null,
  category: 'mainboard',
  status: 'upcoming',
  price: 100,
  ipo_size_cr: 500,
  lot_size: 10,
  rating: 3,
  subscription_times: null,
  anchor: true,
  gmp: null,
  gmp_pct: null,
  gmp_low: null,
  gmp_high: null,
  gmp_updated_at: null,
  open_date: null,
  close_date: null,
  allotment_date: null,
  listing_date: null,
  source_tier: 'tier3_ipo_aggregator',
  fetched_at: '2026-09-10T00:00:00Z',
  ...over,
});

const TODAY = '2026-09-10';

describe('istToday', () => {
  it('formats YYYY-MM-DD in IST', () => {
    // 2026-09-09 20:00 UTC is 2026-09-10 01:30 IST
    expect(istToday(new Date('2026-09-09T20:00:00Z'))).toBe('2026-09-10');
  });
});

describe('evaluateIpoAlert', () => {
  it('null when the IPO is not in the list', () => {
    expect(evaluateIpoAlert({ ipoSlug: 'x', trigger: 'opens' }, undefined, TODAY)).toBeNull();
  });

  it('opens: fires only on the open date', () => {
    const p: IpoAlertParams = { ipoSlug: 'acme-ipo', trigger: 'opens' };
    expect(evaluateIpoAlert(p, ipo({ open_date: TODAY }), TODAY)?.triggered).toBe(true);
    expect(evaluateIpoAlert(p, ipo({ open_date: '2026-09-11' }), TODAY)?.triggered).toBe(false);
    expect(evaluateIpoAlert(p, ipo({ open_date: null }), TODAY)).toBeNull();
  });

  it('last_day: fires on the close date', () => {
    const p: IpoAlertParams = { ipoSlug: 'acme-ipo', trigger: 'last_day' };
    expect(evaluateIpoAlert(p, ipo({ close_date: TODAY }), TODAY)?.triggered).toBe(true);
    expect(evaluateIpoAlert(p, ipo({ close_date: '2026-09-09' }), TODAY)?.triggered).toBe(false);
  });

  it('allotment_listing: fires on allotment OR listing day', () => {
    const p: IpoAlertParams = { ipoSlug: 'acme-ipo', trigger: 'allotment_listing' };
    expect(evaluateIpoAlert(p, ipo({ allotment_date: TODAY }), TODAY)?.triggered).toBe(true);
    expect(evaluateIpoAlert(p, ipo({ listing_date: TODAY, allotment_date: '2026-09-08' }), TODAY)?.triggered).toBe(true);
    expect(evaluateIpoAlert(p, ipo({ allotment_date: '2026-09-08', listing_date: '2026-09-12' }), TODAY)?.triggered).toBe(false);
  });

  it('gmp_threshold: crossing on abs gmp% ; null when GMP unknown', () => {
    const p: IpoAlertParams = { ipoSlug: 'acme-ipo', trigger: 'gmp_threshold', gmpThresholdPct: 20 };
    expect(evaluateIpoAlert(p, ipo({ gmp_pct: 25 }), TODAY)?.triggered).toBe(true);
    expect(evaluateIpoAlert(p, ipo({ gmp_pct: -30 }), TODAY)?.triggered).toBe(true); // magnitude
    expect(evaluateIpoAlert(p, ipo({ gmp_pct: 10 }), TODAY)?.triggered).toBe(false);
    expect(evaluateIpoAlert(p, ipo({ gmp_pct: null, gmp: null }), TODAY)).toBeNull();
  });
});

describe('evaluateIpoWatch', () => {
  const watch = (over: Partial<IpoWatchParams> = {}): IpoWatchParams => ({
    triggers: { opens: true, lastDay: true, allotmentListing: true },
    ipoType: 'all',
    ...over,
  });

  it('fires per (slug, subkey) and records the keys', () => {
    const ipos = [
      ipo({ slug: 'a-ipo', open_date: TODAY }),
      ipo({ slug: 'b-ipo', close_date: TODAY }),
      ipo({ slug: 'c-ipo', allotment_date: TODAY, listing_date: TODAY }),
    ];
    const { hits, keptKeys } = evaluateIpoWatch(watch(), ipos, [], TODAY);
    expect(hits.map((h) => h.key).sort()).toEqual(
      ['a-ipo:opens', 'b-ipo:last_day', 'c-ipo:allotment', 'c-ipo:listing'].sort()
    );
    expect(new Set(keptKeys)).toEqual(new Set(hits.map((h) => h.key)));
  });

  it('does not re-fire keys already in sentKeys', () => {
    const ipos = [ipo({ slug: 'a-ipo', open_date: TODAY })];
    const { hits } = evaluateIpoWatch(watch(), ipos, ['a-ipo:opens'], TODAY);
    expect(hits).toEqual([]);
  });

  it('prunes sentKeys for IPOs no longer in the list', () => {
    const ipos = [ipo({ slug: 'a-ipo' })];
    const { keptKeys } = evaluateIpoWatch(watch(), ipos, ['a-ipo:opens', 'gone-ipo:opens'], TODAY);
    expect(keptKeys).toEqual(['a-ipo:opens']);
  });

  it('respects the mainboard-only filter', () => {
    const ipos = [
      ipo({ slug: 'main-ipo', category: 'mainboard', open_date: TODAY }),
      ipo({ slug: 'sme-ipo', category: 'sme', open_date: TODAY }),
    ];
    const { hits } = evaluateIpoWatch(watch({ ipoType: 'mainboard' }), ipos, [], TODAY);
    expect(hits.map((h) => h.key)).toEqual(['main-ipo:opens']);
  });

  it('fires a GMP-threshold hit when configured', () => {
    const ipos = [ipo({ slug: 'a-ipo', gmp_pct: 40 })];
    const { hits } = evaluateIpoWatch(
      watch({ triggers: { opens: false, lastDay: false, allotmentListing: false }, gmpThresholdPct: 30 }),
      ipos,
      [],
      TODAY
    );
    expect(hits.map((h) => h.key)).toEqual(['a-ipo:gmp']);
  });
});
