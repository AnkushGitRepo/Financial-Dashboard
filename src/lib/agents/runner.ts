// Phase 11 tick worker (ADR 0021). `advanceRun` does ONE unit of work on
// a claimed run doc and persists — analysts, then one debate round per
// call, then synthesis — so no single serverless invocation runs long.
// The route re-invokes the tick until `done`.

import { getUserAiConfig } from '@/lib/ai/userAiConfig';
import { gatherAnalystContext } from './context';
import { buildLessonsContext } from './lessons';
import {
  extractKeyClaims,
  isPhaseError,
  runAnalysts,
  runDebateRound,
  runSynthesis,
} from './orchestrator';
import { patchRun, releaseRun, type AgentRunDoc } from './store';
import { DEBATE_ROUNDS } from './types';

export interface AdvanceResult {
  done: boolean;
  phase: AgentRunDoc['phase'];
  status: AgentRunDoc['status'];
}

async function fail(id: string, error: string): Promise<AdvanceResult> {
  await patchRun(id, { status: 'error', error, lockedAt: null });
  return { done: true, phase: 'complete', status: 'error' };
}

export async function advanceRun(doc: AgentRunDoc): Promise<AdvanceResult> {
  const id = doc._id.toString();

  try {
    const config = await getUserAiConfig(doc.userId);
    if (!config) {
      return fail(id, 'No AI provider key is configured for this account.');
    }
    const model = doc.model ?? config.model?.trim() ?? `${config.provider} (default)`;

    if (doc.phase === 'analysts') {
      const [ctx, lessonsContext] = await Promise.all([
        gatherAnalystContext(doc.symbol, doc.userId),
        buildLessonsContext(doc.userId, doc.symbol, doc.sector).catch(() => null),
      ]);
      const reports = await runAnalysts(config, ctx);
      if (isPhaseError(reports)) return fail(id, reports.error);
      await patchRun(id, {
        analystReports: reports,
        lessonsContext,
        model,
        phase: 'debate',
        debateRoundsDone: 0,
        lockedAt: null,
      });
      return { done: false, phase: 'debate', status: 'running' };
    }

    if (doc.phase === 'debate') {
      const nextRound = doc.debateRoundsDone + 1;
      const turns = await runDebateRound(
        config,
        doc.analystReports,
        doc.debateTurns,
        nextRound,
        doc.lessonsContext ?? undefined
      );
      if (isPhaseError(turns)) return fail(id, turns.error);
      const lastRound = nextRound >= DEBATE_ROUNDS;
      await patchRun(id, {
        debateTurns: [...doc.debateTurns, ...turns],
        debateRoundsDone: nextRound,
        phase: lastRound ? 'synthesis' : 'debate',
        lockedAt: null,
      });
      return { done: false, phase: lastRound ? 'synthesis' : 'debate', status: 'running' };
    }

    if (doc.phase === 'synthesis') {
      const synth = await runSynthesis(
        config,
        doc.analystReports,
        doc.debateTurns,
        doc.lessonsContext ?? undefined
      );
      if (isPhaseError(synth)) return fail(id, synth.error);
      const keyClaims = await extractKeyClaims(config, synth.briefing, doc.debateTurns);
      await patchRun(id, {
        briefing: synth.briefing,
        briefingRegenerated: synth.regenerated,
        keyClaims,
        model,
        status: 'done',
        phase: 'complete',
        lockedAt: null,
      });
      return { done: true, phase: 'complete', status: 'done' };
    }

    // 'complete' — nothing to do; make sure it's not left locked.
    await releaseRun(id);
    return { done: true, phase: 'complete', status: doc.status };
  } catch (err) {
    return fail(id, err instanceof Error ? err.message : 'agent run failed');
  }
}
