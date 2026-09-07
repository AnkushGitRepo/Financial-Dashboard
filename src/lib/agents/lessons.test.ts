import { beforeEach, describe, expect, it, vi } from 'vitest';

const reflectedRunsForContext = vi.fn();
vi.mock('./store', () => ({ reflectedRunsForContext: (...a: unknown[]) => reflectedRunsForContext(...a) }));

const { buildLessonsContext } = await import('./lessons');

const run = (lessons: string, movePct: number | null = 8) => ({
  reflection: { writtenAt: '2026-08-01T00:00:00.000Z', horizonDays: 24, movePct, lessons },
});

beforeEach(() => reflectedRunsForContext.mockReset());

describe('buildLessonsContext', () => {
  it('returns null when there are no reflected runs', async () => {
    reflectedRunsForContext.mockResolvedValue([]);
    expect(await buildLessonsContext('u1', 'TCS', 'IT')).toBeNull();
  });

  it('formats each reflection with its review date and price move', async () => {
    reflectedRunsForContext.mockResolvedValue([
      run('The bear case on margins held up.'),
      run('The bull thesis on order book was too optimistic.', -3),
    ]);
    const out = await buildLessonsContext('u1', 'TCS', 'IT');
    expect(out).toContain('calibration of the reasoning only, NOT predictions');
    expect(out).toContain('[reviewed 2026-08-01 (the stock moved +8.0% over ~24d)] The bear case on margins held up.');
    expect(out).toContain('(the stock moved -3.0% over ~24d)');
  });

  it('skips reflections with empty lessons text', async () => {
    reflectedRunsForContext.mockResolvedValue([run('   '), run('real lesson')]);
    const out = await buildLessonsContext('u1', 'TCS', null);
    expect(out).toContain('real lesson');
    expect(out!.split('\n- ').length).toBe(2); // header + 1 bullet
  });
});
