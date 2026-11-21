import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'stats-kit/contrat': src('./packages/contrat/src/index.ts'),
      'stats-kit/serveur': src('./packages/serveur/src/index.ts'),
    },
  },
  test: {
    include: ['packages/contrat/test/**/*.test.ts', 'packages/serveur/test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000, // la carte PNG du rapport est dessinée en pur JavaScript
    coverage: {
      provider: 'v8',
      include: ['packages/contrat/src/**/*.ts', 'packages/serveur/src/**/*.ts'],
      exclude: ['**/index.ts', '**/types.ts', '**/centroides.ts'],
      reporter: ['text-summary', 'text', 'lcov'],
      reportsDirectory: 'coverage/serveur',
      thresholds: { lines: 100, statements: 99, functions: 99, branches: 92 },
    },
  },
});
