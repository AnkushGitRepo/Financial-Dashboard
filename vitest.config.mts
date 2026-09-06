import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests only — the pure logic under src/lib (alert evaluators, market
// hours, portfolio maths). No jsdom, no DB, no network. Route handlers and
// Mongo data-access are verified separately (build + live checks), matching
// how the rest of this repo tests the Next.js side.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
