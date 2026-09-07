import { describe, expect, it } from 'vitest';
import { ema, maCross, maxDrawdown, rsi, sma, summariseTechnicals } from './indicators';

const ramp = (n: number, start = 100, step = 1) =>
  Array.from({ length: n }, (_, i) => start + i * step);

describe('sma / ema', () => {
  it('sma is the mean of the last `period` values', () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3);
    expect(sma([2, 4, 6, 8], 2)).toBe(7);
  });
  it('returns null when the series is shorter than the period', () => {
    expect(sma([1, 2], 5)).toBeNull();
    expect(ema([1, 2], 5)).toBeNull();
  });
  it('ema of a flat series equals that value', () => {
    expect(ema([5, 5, 5, 5, 5, 5], 3)).toBeCloseTo(5);
  });
});

describe('rsi', () => {
  it('is 100 for a monotonically rising series (no losses)', () => {
    expect(rsi(ramp(30), 14)).toBe(100);
  });
  it('is low for a monotonically falling series', () => {
    const r = rsi(ramp(30, 200, -1), 14);
    expect(r).not.toBeNull();
    expect(r!).toBeLessThan(5);
  });
  it('returns null without enough points', () => {
    expect(rsi([1, 2, 3], 14)).toBeNull();
  });
});

describe('maxDrawdown', () => {
  it('measures the largest peak-to-trough decline as a fraction', () => {
    expect(maxDrawdown([100, 120, 60, 90])).toBeCloseTo(0.5); // 120 -> 60
    expect(maxDrawdown([100, 101, 102])).toBe(0);
  });
});

describe('maCross', () => {
  // Small periods so the cross point is exact and easy to reason about.
  it('reports a golden cross when the short MA rises through the long MA', () => {
    // 6 flat then a jump: short(3) overtakes long(5) within the last 3 points
    const closes = [10, 10, 10, 10, 10, 10, 20, 20, 20];
    expect(maCross(closes, 3, 5, 3)).toBe('golden');
  });
  it('reports a death cross the other way', () => {
    const closes = [20, 20, 20, 20, 20, 20, 10, 10, 10];
    expect(maCross(closes, 3, 5, 3)).toBe('death');
  });
  it('reports none on a steady trend', () => {
    expect(maCross(ramp(120), 20, 50)).toBe('none');
  });
});

describe('summariseTechnicals', () => {
  it('rolls up the indicators and the above/below-SMA flags', () => {
    const s = summariseTechnicals(ramp(80));
    expect(s.points).toBe(80);
    expect(s.lastClose).toBe(179);
    expect(s.aboveSma20).toBe(true);
    expect(s.aboveSma50).toBe(true);
    expect(s.rsi14).toBe(100);
    expect(s.periodReturnPct).toBeCloseTo(((179 - 100) / 100) * 100);
  });
  it('degrades to nulls on a tiny series', () => {
    const s = summariseTechnicals([150]);
    expect(s.sma20).toBeNull();
    expect(s.rsi14).toBeNull();
    expect(s.periodReturnPct).toBeNull();
    expect(s.cross).toBe('none');
  });
  it('filters out non-positive / non-finite prices', () => {
    const s = summariseTechnicals([100, 0, NaN, 110, 120]);
    expect(s.points).toBe(3);
  });
});
