// Tools handed to the Mitra chat model (Phase 10 / ADR 0020; navigation
// tools added in ADR 0022).
//
// Three groups:
//   - the read-only market-data tools from the MCP layer (`src/lib/mcp/
//     tools.ts`), adapted to the AI SDK's `tool()` shape — live quotes,
//     fundamentals, price history, news, IPOs, indices;
//   - `search_context`, which vector-searches the retrieval corpus
//     (indexed news + filings + the caller's private notes/holdings);
//   - 4 navigation tools that let the client move the user to a page.
//
// Structured/current data is tool-called, not embedded (ADR 0020). The
// chat route wraps `streamChat` in a tool-calling loop with these.
//
// HARD BOUNDARY (ADR 0022): this is the *entire* ToolSet Mitra ever
// receives. There is no tool here for account settings, security settings,
// billing, or any destructive action (deleting a holding, deleting the
// account, changing security settings) — and there never should be. The
// boundary is enforced by these tools simply not existing, not by a prompt
// instruction. If you're adding a tool, it belongs in this file; adding one
// of the excluded categories needs its own ADR, not a quiet addition here.

import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { tools as mcpTools } from '@/lib/mcp/tools';
import { retrieve } from '@/lib/rag/retrieve';

const SEARCH_CONTEXT_LIMIT = 6;

export function buildChatTools(userId: string | null): ToolSet {
  const set: ToolSet = {};

  for (const t of mcpTools) {
    set[t.name] = tool({
      description: t.config.description,
      inputSchema: t.config.inputSchema,
      execute: async (args: unknown) => {
        try {
          return await t.run(args as never);
        } catch (err) {
          return { error: err instanceof Error ? err.message : 'tool failed' };
        }
      },
    });
  }

  set.search_context = tool({
    description:
      "Search MarketMitra's indexed corpus — recent news articles, company annual-report filings, and the user's own saved notes — for passages relevant to a question. Use for background, \"why did X move\", or filing detail. Returns short passages with their source; `available: false` means the corpus isn't reachable, fall back to the other tools.",
    inputSchema: z.object({
      query: z.string().trim().min(1).max(400).describe('A natural-language search query.'),
      symbol: z
        .string()
        .trim()
        .max(30)
        .optional()
        .describe('Restrict to this NSE symbol plus non-stock passages.'),
    }),
    execute: async ({ query, symbol }) => {
      const hits = await retrieve({
        query,
        userId,
        symbol: symbol ? symbol.toUpperCase() : undefined,
        limit: SEARCH_CONTEXT_LIMIT,
      });
      if (hits === null) return { available: false, passages: [] };
      return {
        available: true,
        passages: hits.map((h) => ({
          text: h.text,
          source: h.title ?? h.source,
          url: h.sourceUrl,
          kind: h.docType,
          published: h.publishedAt ? h.publishedAt.toISOString().slice(0, 10) : null,
          score: Number(h.score.toFixed(3)),
        })),
      };
    },
  });

  // Navigation (ADR 0022). Each `execute` only confirms the destination —
  // it cannot move the browser itself. The client (AiWidget) watches for
  // these specific tool parts and calls `router.push` to the route named
  // here, so the two must stay in sync.
  set.navigate_to_dashboard = tool({
    description: 'Open the dashboard home page.',
    inputSchema: z.object({}),
    execute: async () => ({ navigated: true, to: '/dashboard' }),
  });

  set.navigate_to_portfolio = tool({
    description: 'Open the portfolio / holdings page.',
    inputSchema: z.object({}),
    execute: async () => ({ navigated: true, to: '/dashboard/portfolio' }),
  });

  set.navigate_to_markets = tool({
    description: 'Open the markets page (indices, movers).',
    inputSchema: z.object({}),
    execute: async () => ({ navigated: true, to: '/dashboard/markets' }),
  });

  set.open_stock = tool({
    description:
      "Open a stock's detail page. Use the NSE symbol the user means (from context if they said 'this stock' or similar).",
    inputSchema: z.object({
      ticker: z.string().trim().min(1).max(20).describe('NSE symbol, e.g. TCS.'),
    }),
    execute: async ({ ticker }) => ({
      navigated: true,
      to: `/dashboard/stock/${encodeURIComponent(ticker.toUpperCase())}`,
    }),
  });

  return set;
}
