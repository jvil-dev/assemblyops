/**
 * Test env preload - loads .env<NODE_ENV> before any test module imports
 * app code, so import-time secret reads (utils/jwt.ts) resolve
 */
import { config as loadEnv } from 'dotenv-flow';

loadEnv();

// Provide a cron secret for tests hitting /api/cron/* when the env omits one.
process.env.CRON_SECRET ??= 'local-dev-cron-secret-change-in-production';
