import { defineConfig } from 'vitest/config';

/**
 * Test environment. Values are fixtures, not secrets — tests run against the
 * throwaway Postgres in docker-compose.yml, never Railway. Set here rather than
 * in a .env file so they load before any module reads process.env at import time
 * (utils/jwt.ts), and stay reviewable in git. Mirrors backend-ci.yml.
 */
const TEST_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/assemblyops_test',
  DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/assemblyops_test',
  DATABASE_SSL: 'false',
  JWT_SECRET: 'test-jwt-secret-not-for-production',
  JWT_REFRESH_SECRET: 'test-refresh-secret-not-for-production',
  // AES-256 needs 64 hex chars; any valid-format value works for tests.
  PII_ENCRYPTION_KEY: 'a'.repeat(64),
  CRON_SECRET: 'test-cron-secret',
};

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: TEST_ENV,
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
