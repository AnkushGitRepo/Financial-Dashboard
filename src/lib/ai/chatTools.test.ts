import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { RetrievedChunk } from '@/lib/rag/retrieve';

const run = vi.fn<(a: unknown) => Promise<unknown>>();
vi.mock('@/lib/mcp/tools', () => ({
  tools: [
    {
      name: 'get_quote',
      config: { title: 'Quote', description: 'Live quote', inputSchema: z.object({ symbol: z.string() }) },
      run: (a: unknown) => run(a),
    },
  ],
}));

const retrieve = vi.fn<() => Promise<RetrievedChunk[] | null>>();
vi.mock('@/lib/rag/retrieve', () => ({ retrieve: () => retrieve() }));

const { buildChatTools } = await import('./chatTools');

type ExecTool = { execute: (args: unknown) => Promise<unknown> };

beforeEach(() => {
  run.mockReset();
  retrieve.mockReset();
});

describe('buildChatTools', () => {
  it('adapts every MCP tool plus search_context', () => {
    const set = buildChatTools('u1');
    expect(Object.keys(set).sort()).toEqual(['get_quote', 'search_context']);
    expect(typeof (set.get_quote as unknown as ExecTool).execute).toBe('function');
  });

  it('an adapted MCP tool calls run and passes args through', async () => {
    run.mockResolvedValue({ ltp: 2500 });
    const set = buildChatTools('u1');
    const out = await (set.get_quote as unknown as ExecTool).execute({ symbol: 'RELIANCE' });
    expect(run).toHaveBeenCalledWith({ symbol: 'RELIANCE' });
    expect(out).toEqual({ ltp: 2500 });
  });

  it('an adapted MCP tool surfaces a thrown error as { error }', async () => {
    run.mockRejectedValue(new Error('upstream 502'));
    const set = buildChatTools('u1');
    expect(await (set.get_quote as unknown as ExecTool).execute({ symbol: 'X' })).toEqual({ error: 'upstream 502' });
  });

  it('search_context maps retrieved chunks to passages', async () => {
    retrieve.mockResolvedValue([
      {
        text: 'Reliance guided to higher capex.',
        score: 0.827_3,
        source: 'https://x/a',
        sourceUrl: 'https://x/a',
        title: 'Reliance ups capex',
        docType: 'news',
        symbol: 'RELIANCE',
        publishedAt: new Date('2026-09-01T00:00:00Z'),
      },
    ]);
    const set = buildChatTools('u1');
    const out = (await (set.search_context as unknown as ExecTool).execute({ query: 'why capex' })) as {
      available: boolean;
      passages: Array<Record<string, unknown>>;
    };
    expect(out.available).toBe(true);
    expect(out.passages[0]).toEqual({
      text: 'Reliance guided to higher capex.',
      source: 'Reliance ups capex',
      url: 'https://x/a',
      kind: 'news',
      published: '2026-09-01',
      score: 0.827,
    });
  });

  it('search_context reports unavailable when retrieval returns null', async () => {
    retrieve.mockResolvedValue(null);
    const set = buildChatTools(null);
    expect(await (set.search_context as unknown as ExecTool).execute({ query: 'q' })).toEqual({
      available: false,
      passages: [],
    });
  });
});
