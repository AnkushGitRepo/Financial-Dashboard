import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { AgentRunDoc } from './store';

const m = vi.hoisted(() => ({
  getUserAiConfig: vi.fn(),
  gatherAnalystContext: vi.fn(),
  runAnalysts: vi.fn(),
  runDebateRound: vi.fn(),
  runSynthesis: vi.fn(),
  extractKeyClaims: vi.fn(),
  patchRun: vi.fn(),
  releaseRun: vi.fn(),
}));

vi.mock('@/lib/ai/userAiConfig', () => ({ getUserAiConfig: m.getUserAiConfig }));
vi.mock('./context', () => ({ gatherAnalystContext: m.gatherAnalystContext }));
vi.mock('./orchestrator', async (orig) => ({
  ...(await orig<typeof import('./orchestrator')>()),
  runAnalysts: m.runAnalysts,
  runDebateRound: m.runDebateRound,
  runSynthesis: m.runSynthesis,
  extractKeyClaims: m.extractKeyClaims,
}));
vi.mock('./store', () => ({ patchRun: m.patchRun, releaseRun: m.releaseRun }));

const { advanceRun } = await import('./runner');

const baseDoc = (over: Partial<AgentRunDoc> = {}): AgentRunDoc => ({
  _id: new ObjectId(),
  userId: 'u1',
  symbol: 'RELIANCE',
  companyName: 'Reliance',
  status: 'running',
  phase: 'analysts',
  priceAtRun: 100,
  analystReports: [],
  debateTurns: [],
  debateRoundsDone: 0,
  briefing: null,
  briefingRegenerated: false,
  keyClaims: [],
  reflection: null,
  model: null,
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lockedAt: new Date(),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.getUserAiConfig.mockResolvedValue({ provider: 'gemini', apiKey: 'k' });
  m.gatherAnalystContext.mockResolvedValue({});
  m.runAnalysts.mockResolvedValue([{ role: 'fundamentals', text: 'F', hadData: true }]);
  m.runDebateRound.mockResolvedValue([
    { side: 'bull', round: 1, text: 'b' },
    { side: 'bear', round: 1, text: 'r' },
  ]);
  m.runSynthesis.mockResolvedValue({ briefing: '## Bull case\n…', regenerated: false });
  m.extractKeyClaims.mockResolvedValue([{ side: 'bear', claim: 'margins' }]);
});

describe('advanceRun', () => {
  it('errors the run when no AI key is configured', async () => {
    m.getUserAiConfig.mockResolvedValue(null);
    const r = await advanceRun(baseDoc());
    expect(r).toMatchObject({ done: true, status: 'error' });
    expect(m.patchRun.mock.calls[0][1]).toMatchObject({ status: 'error' });
  });

  it('analysts phase → runs analysts, advances to debate', async () => {
    const r = await advanceRun(baseDoc({ phase: 'analysts' }));
    expect(r).toEqual({ done: false, phase: 'debate', status: 'running' });
    expect(m.patchRun.mock.calls[0][1]).toMatchObject({ phase: 'debate', debateRoundsDone: 0 });
  });

  it('analysts phase → errors on a PhaseError', async () => {
    m.runAnalysts.mockResolvedValue({ error: 'quota' });
    const r = await advanceRun(baseDoc({ phase: 'analysts' }));
    expect(r.status).toBe('error');
    expect(m.patchRun.mock.calls[0][1]).toMatchObject({ status: 'error', error: 'quota' });
  });

  it('debate phase round 1 of 2 → appends 2 turns, stays in debate', async () => {
    const r = await advanceRun(baseDoc({ phase: 'debate', debateRoundsDone: 0 }));
    expect(r).toEqual({ done: false, phase: 'debate', status: 'running' });
    const patch = m.patchRun.mock.calls[0][1];
    expect(patch.debateRoundsDone).toBe(1);
    expect(patch.debateTurns).toHaveLength(2);
    expect(patch.phase).toBe('debate');
  });

  it('debate phase final round → advances to synthesis', async () => {
    m.runDebateRound.mockResolvedValue([
      { side: 'bull', round: 2, text: 'b2' },
      { side: 'bear', round: 2, text: 'r2' },
    ]);
    const r = await advanceRun(
      baseDoc({ phase: 'debate', debateRoundsDone: 1, debateTurns: [{ side: 'bull', round: 1, text: 'b' }] })
    );
    expect(r.phase).toBe('synthesis');
    expect(m.patchRun.mock.calls[0][1]).toMatchObject({ phase: 'synthesis', debateRoundsDone: 2 });
  });

  it('synthesis phase → writes the briefing + claims, marks done', async () => {
    const r = await advanceRun(baseDoc({ phase: 'synthesis' }));
    expect(r).toEqual({ done: true, phase: 'complete', status: 'done' });
    expect(m.patchRun.mock.calls[0][1]).toMatchObject({
      briefing: '## Bull case\n…',
      status: 'done',
      phase: 'complete',
    });
  });

  it('catches a thrown error and fails the run', async () => {
    m.gatherAnalystContext.mockRejectedValue(new Error('mongo down'));
    const r = await advanceRun(baseDoc({ phase: 'analysts' }));
    expect(r.status).toBe('error');
    expect(m.patchRun.mock.calls[0][1]).toMatchObject({ error: 'mongo down' });
  });
});
