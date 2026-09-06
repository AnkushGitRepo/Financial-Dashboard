import { describe, expect, it } from 'vitest';
import { isNseSession } from './marketHours';

// IST is UTC+5:30, no DST. 09:15 IST = 03:45 UTC; 15:35 IST = 10:05 UTC.
// 2026-09-07 is a Monday, 2026-09-12 a Saturday, 2026-09-13 a Sunday.

describe('isNseSession', () => {
  it.each([
    ['weekday just after open', '2026-09-07T03:45:00Z', true], // 09:15 IST Mon
    ['weekday mid-session', '2026-09-07T06:00:00Z', true], // 11:30 IST
    ['weekday at the post-close grace edge', '2026-09-07T10:05:00Z', true], // 15:35 IST
    ['weekday just before open', '2026-09-07T03:44:00Z', false], // 09:14 IST
    ['weekday after the grace edge', '2026-09-07T10:06:00Z', false], // 15:36 IST
    ['weekday late evening', '2026-09-07T18:00:00Z', false], // 23:30 IST
    ['Saturday during would-be hours', '2026-09-12T06:00:00Z', false],
    ['Sunday during would-be hours', '2026-09-13T06:00:00Z', false],
  ] as const)('%s -> %s', (_label, iso, want) => {
    expect(isNseSession(new Date(iso))).toBe(want);
  });

  it('uses the IST calendar day, not the UTC one', () => {
    // 2026-09-11 (Fri) 22:30Z = 2026-09-12 (Sat) 04:00 IST — Saturday in IST,
    // so no session even though UTC still says Friday.
    expect(isNseSession(new Date('2026-09-11T22:30:00Z'))).toBe(false);
    // 2026-09-11 (Fri) 06:00Z = Fri 11:30 IST — in session.
    expect(isNseSession(new Date('2026-09-11T06:00:00Z'))).toBe(true);
  });
});
