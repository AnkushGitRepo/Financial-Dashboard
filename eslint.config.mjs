import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // services/fundamentals-api is a standalone Python service (ADR 0011) —
    // its .venv ships huge minified JS (Playwright/Patchright bundles) that
    // crashes ESLint's formatter if linted as part of this project.
    'services/**',
  ]),
]);

export default eslintConfig;
