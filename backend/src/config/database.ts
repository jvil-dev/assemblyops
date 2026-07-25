/**
 * Database Configuration
 *
 * Sets up the Prisma client with PostgreSQL connection pooling.
 * Uses the pg library for connection management and PrismaPg adapter.
 *
 * Connection:
 *   - Reads DATABASE_URL from environment variables
 *   - Enables SSL when DATABASE_SSL=true
 *   - Uses pg.Pool for connection pooling (better performance)
 *
 * Logging:
 *   - Development: Logs queries, errors, warnings
 *   - Production: Only logs errors
 *
 * Railway Note:
 *   - DATABASE_URL (runtime) and DIRECT_URL (migrations) point at the same
 *     Postgres 18 host; the split carries no meaning
 *   - Services connect over postgres.railway.internal; local machines use the
 *     public TCP proxy exposed as DATABASE_PUBLIC_URL
 *
 * Exports: Default prisma client instance used throughout the app
 *
 * Used by: All services, resolvers, and context.ts
 */
import { config as loadEnv } from 'dotenv-flow';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// silent: env comes from Railway (or vitest config in tests); .env files are optional.
loadEnv({ silent: true });

// Enable SSL for external connections that require it
const useSSL = process.env.DATABASE_SSL === 'true';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ...(useSSL && { ssl: { rejectUnauthorized: false } }),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
