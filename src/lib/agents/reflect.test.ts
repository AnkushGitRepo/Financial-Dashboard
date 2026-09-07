import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { AgentRunDoc } from './store';

const m = vi.hoisted(() => ({
  generateInsightText: vi.fn(),
  getUserAiConfig: vi.fn(),
  getPrices: vi.fn(),
  patchRun: vi.fn(),
}));
vi.mock('@/lib/ai/generate', () => ({ generateInsightText: m.generateInsightText }));
vi.mock('@/lib/ai/userAiConfig', () => ({ getUserAiConfig: m.getUserAiConfig }));
vi.mock('@/lib/dashboard/fundamentalsApi', () => ({ getPrices: m.getPrices }));
vi.mock('./store', () => ({ patchRun: m.patchRun }));

const { reflectOnRun } = await import('./reflect');

const doc = (over: Partial<AgentRunDoc> = {}): AgentRunDoc =>
  ({
    _id: new ObjectId(),
    userId: 'u1',
    symbol: 'TCS',
    companyName: 'TCS',
    sector: 'IT',
    priceAtRun: 100,
    briefing: '## Bull case\n…',
    keyClaims: [{ side: 'bear', claim: 'margins compressing' }],
    createdAt: new Date(Date.now() - 30 * 864e5),
    ...over,
  }) as AgentRunDoc;

beforeEach(() => {
  vi.clearAllMocks();
  m.getUserAiConfig.mockResolvedValue({ provider: 'gemini', apiKey: 'k' });
  m.getPrices.mockResolvedValue([{ close: '90' }, { close: '110' }]);
  m.generateInsightText.mockResolvedValue({ ok: true, text: 'The bear case on margins held up.', model: 'm' });
});

describe('reflectOnRun', () => {
  it('writes a reflection with the price move and lessons', async () => {
    const r = await reflectOnRun(doc());
    expect(r.status).toBe('written');
    const patch = m.patchRun.mock.calls[0][1];
    expect(patch.reflection.lessons).toBe('The bear case on margins held up.');
    expect(patch.reflection.priceAtReflection).toBe(110);
    expect(patch.reflection.movePct).toBeCloseTo(10);
    expect(patch.reflection.horizonDays).toBeGreaterThanOrEqual(21);
  });

  it('skips when the account has no AI key', async () => {
    m.getUserAiConfig.mockResolvedValue(null);
    expect((await reflectOnRun(doc())).status).toBe('skipped');
    expect(m.patchRun).not.toHaveBeenCalled();
  });

  it('skips a run with no briefing or claims', async () => {
    expect((await reflectOnRun(doc({ keyClaims: [] }))).status).toBe('skipped');
  });

  it('reports an error when the LLM call fails', async () => {
    m.generateInsightText.mockResolvedValue({ ok: false, error: 'quota' });
    const r = await reflectOnRun(doc());
    expect(r).toEqual({ id: expect.any(String), status: 'error', detail: 'quota' });
  });

  it('tolerates missing price data (movePct null)', async () => {
    m.getPrices.mockResolvedValue(null);
    const r = await reflectOnRun(doc());
    expect(r.status).toBe('written');
    expect(m.patchRun.mock.calls[0][1].reflection.movePct).toBeNull();
  });
});
