import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'stats-kit/contract': src('./packages/contract/src/index.ts'),
      'stats-kit/server': src('./packages/server/src/index.ts'),
    },
  },
  test: {
    include: ['packages/contract/test/**/*.test.ts', 'packages/server/test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000, // the PNG map of the report is drawn in pure JavaScript
    coverage: {
      provider: 'v8',
      include: ['packages/contract/src/**/*.ts', 'packages/server/src/**/*.ts'],
      exclude: ['**/index.ts', '**/types.ts', '**/centroids.ts'],
      reporter: ['text-summary', 'text', 'lcov'],
      reportsDirectory: 'coverage/server',
      thresholds: { lines: 100, statements: 99, functions: 99, branches: 92 },
    },
  },
});
