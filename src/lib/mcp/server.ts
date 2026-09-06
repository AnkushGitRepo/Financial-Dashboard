// Adapts the tool definitions in ./tools.ts into MCP `registerTool` calls.
// Kept separate from tools.ts so the tools stay testable without pulling in
// the MCP SDK, and separate from the route so `registerMarketMitraTools` can
// be exercised against a fake server in tests.

import type { McpServer } from '@modelcontextprotocol/server';
import { tools } from './tools';

export const MCP_SERVER_INFO = {
  name: 'marketmitra',
  version: '1.0.0',
} as const;

/**
 * Register every MarketMitra tool on an MCP server instance. Each tool's
 * `run(args)` result is returned both as pretty-printed JSON text (broadest
 * client compatibility) and as `structuredContent` for clients that use it.
 */
export function registerMarketMitraTools(server: McpServer): void {
  for (const tool of tools) {
    server.registerTool(tool.name, tool.config, async (args: unknown) => {
      try {
        const data = await tool.run(args as never);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
          structuredContent: data as Record<string, unknown>,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'tool execution failed';
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    });
  }
}
