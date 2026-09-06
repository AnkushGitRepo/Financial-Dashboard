// MarketMitra MCP server (Phase 9, ADR 0019).
//
// A stateless Streamable HTTP MCP endpoint mounted in the Next app rather
// than a standalone service — the tools wrap `src/lib/dashboard/*`, which
// already talks to `services/fundamentals-api`, so a separate service would
// only add a hop. v1 tools are read-only public data; no auth (rate
// limiting is Phase 9 Part 2).
//
// Client config (Streamable HTTP): { "url": "https://<host>/api/mcp" }

import { createMcpHandler } from 'mcp-handler';
import { registerMarketMitraTools, MCP_SERVER_INFO } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const handler = createMcpHandler(registerMarketMitraTools, {
  serverInfo: MCP_SERVER_INFO,
  instructions:
    'MarketMitra exposes read-only Indian-market reference data: NSE symbol search, live quotes, company fundamentals (ratios, financials, shareholding, peers, documents), price history, market news (with rough headline-tone sentiment), IPOs with unofficial grey-market premium, and index levels. All figures are public reference data, not investment advice. Resolve company names to symbols with search_symbols first.',
});

export { handler as GET, handler as POST };
