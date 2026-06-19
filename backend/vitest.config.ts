import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/loadEnv.ts'],
    include: [
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.integration.ts',
      'src/__tests__/**/*.unit.ts',
    ],
    testTimeout: 10000,
    pool: 'forks',
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/services/**/*.ts', 'src/graphql/guards/auth.ts'],
      exclude: ['src/__tests__/**', 'src/generated/**', 'src/services/awsService.ts'],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 45,
        statements: 50,
      },
      reporter: ['text', 'lcov', 'json-summary'],
    },
  },
});
