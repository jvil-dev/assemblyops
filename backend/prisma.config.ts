/**
 * Prisma Configuration
 *
 * Configuration for Prisma CLI commands (migrate, generate, seed).
 * This file is used by Prisma 7+ for centralized configuration.
 *
 * Settings:
 *   - schema: Path to Prisma schema file
 *   - migrations.path: Where migration files are stored
 *   - migrations.seed: Command to run database seeding
 *   - datasource.url: Database connection string from environment
 *
 * Commands:
 *   - npm run prisma:migrate: Create/run migrations
 *   - npm run prisma:push: Push schema changes (no migration file)
 *   - npm run prisma:generate: Generate Prisma client
 *   - npm run prisma:seed: Run seed script
 *
 * Note: Uses dotenv/config to load .env.<NODE_ENV> file for DATABASE_URL / DIRECT_URL
 */
import { config as loadEnv } from 'dotenv-flow';
import { defineConfig } from 'prisma/config';

loadEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    // Use DIRECT_URL for migrations, fallback to DATABASE_URL for generate/other commands
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});
