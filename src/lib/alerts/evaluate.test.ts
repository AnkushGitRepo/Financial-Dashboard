import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Alert } from './types';

// --- mocks: everything that touches the network or the database ---------

const { listActiveAlerts, applyAlertTransition, getQuotes, listHoldings, deliverNotification, resolveChannels } =
  vi.hoisted(() => ({
    listActiveAlerts: vi.fn<() => Promise<Alert[]>>(),
    applyAlertTransition: vi.fn<(...args: unknown[]) => Promise<void>>(async () => {}),
    getQuotes: vi.fn<(...args: unknown[]) => Promise<unknown[]>>(),
    listHoldings: vi.fn<(...args: unknown[]) => Promise<unknown[]>>(),
    deliverNotification: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({})),
    resolveChannels: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ email: false, webhook: false })),
  }));

vi.mock('./store', () => ({ listActiveAlerts, applyAlertTransition }));
vi.mock('@/lib/dashboard/fundamentalsApi', () => ({ getQuotes }));
vi.mock('@/lib/holdings', () => ({ listHoldings }));
vi.mock('@/lib/notifications/deliver', () => ({ deliverNotification, resolveChannels }));

// import under test AFTER the mocks are registered
import { evaluateAlerts } from './evaluate';

const NOW = new Date('2026-09-07T06:00:00.000Z');

const alert = (over: Partial<Alert>): Alert => ({
  id: 'a1',
  userId: 'u1',
  type: 'price_threshold',
  symbol: 'RELIANCE',
  params: { direction: 'above', threshold: 1000 },
  note: null,
  status: 'active',
  rearm: false,
  cooldownMinutes: 60,
  armed: true,
  cooldownUntil: null,
  lastEvaluatedAt: null,
  triggeredAt: null,
  lastObservedValue: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

const quote = (symbol: string, price: number) => ({
  symbol,
  price: String(price),
  prev_close: String(price),
  change_pct: '0',
  week52_high: String(price * 1.5),
  week52_low: String(price * 0.5),
  as_of: NOW.toISOString(),
  source_tier: 'tier2_yfinance',
});

beforeEach(() => {
  vi.clearAllMocks();
  listHoldings.mockResolvedValue([]);
});

describe('evaluateAlerts', () => {
  it('does nothing (no quote fetch) when there are no active alerts', async () => {
    listActiveAlerts.mockResolvedValue([]);
    const summary = await evaluateAlerts(NOW);
    expect(summary).toEqual({ activeAlerts: 0, symbolsQuoted: 0, notified: 0, skippedNoData: 0, errors: 0 });
    expect(getQuotes).not.toHaveBeenCalled();
  });

  it('fires a price alert that crosses its threshold and delivers once', async () => {
    listActiveAlerts.mockResolvedValue([alert({ params: { direction: 'above', threshold: 1000 } })]);
    getQuotes.mockResolvedValue([quote('RELIANCE', 1200)]);

    const summary = await evaluateAlerts(NOW);

    expect(summary.notified).toBe(1);
    expect(deliverNotification).toHaveBeenCalledOnce();
    const [userId, payload] = deliverNotification.mock.calls[0];
    expect(userId).toBe('u1');
    expect(payload).toMatchObject({ kind: 'alert' });
    const [id, patch] = applyAlertTransition.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe('a1');
    expect(patch.status).toBe('triggered');
  });

  it('does not fire when the condition is not met, but still records the observation', async () => {
    listActiveAlerts.mockResolvedValue([alert({ params: { direction: 'above', threshold: 5000 } })]);
    getQuotes.mockResolvedValue([quote('RELIANCE', 1200)]);

    const summary = await evaluateAlerts(NOW);

    expect(summary.notified).toBe(0);
    expect(deliverNotification).not.toHaveBeenCalled();
    const [, patch] = applyAlertTransition.mock.calls[0] as [string, Record<string, unknown>];
    expect(patch.lastObservedValue).toBe(1200);
    expect(patch.status).toBeUndefined();
  });

  it('skips (skippedNoData) an alert whose symbol has no quote — never fires on missing data', async () => {
    listActiveAlerts.mockResolvedValue([alert({})]);
    getQuotes.mockResolvedValue([]); // upstream returned nothing

    const summary = await evaluateAlerts(NOW);

    expect(summary).toMatchObject({ activeAlerts: 1, skippedNoData: 1, notified: 0 });
    expect(deliverNotification).not.toHaveBeenCalled();
    const [, patch] = applyAlertTransition.mock.calls[0] as [string, Record<string, unknown>];
    expect(patch.status).toBeUndefined();
  });

  it('evaluates a whole-portfolio P&L alert against the user\'s holdings + quotes', async () => {
    listActiveAlerts.mockResolvedValue([
      alert({
        id: 'p1',
        type: 'portfolio_pnl',
        symbol: null,
        params: { metric: 'unrealized_pnl', direction: 'above', threshold: 1000 },
      }),
    ]);
    listHoldings.mockResolvedValue([
      { id: 'h1', userId: 'u1', symbol: 'RELIANCE', quantity: 10, avgPrice: 100, createdAt: NOW, updatedAt: NOW },
    ]);
    getQuotes.mockResolvedValue([quote('RELIANCE', 300)]); // value 3000, cost 1000, pnl +2000

    const summary = await evaluateAlerts(NOW);

    expect(listHoldings).toHaveBeenCalledWith('u1');
    expect(summary.notified).toBe(1);
    expect(getQuotes.mock.calls[0][0]).toContain('RELIANCE');
  });

  it('counts a delivery failure as an error and keeps going', async () => {
    listActiveAlerts.mockResolvedValue([
      alert({ id: 'a1', symbol: 'RELIANCE', params: { direction: 'above', threshold: 100 } }),
      alert({ id: 'a2', symbol: 'TCS', params: { direction: 'above', threshold: 100 } }),
    ]);
    getQuotes.mockResolvedValue([quote('RELIANCE', 200), quote('TCS', 200)]);
    deliverNotification.mockRejectedValueOnce(new Error('smtp down'));

    const summary = await evaluateAlerts(NOW);

    expect(summary.errors).toBe(1);
    expect(summary.notified).toBe(1); // the second one still delivered
    expect(applyAlertTransition).toHaveBeenCalledTimes(2);
  });
});
