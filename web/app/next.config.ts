/**
 * Next.js Configuration
 *
 * Build and runtime configuration for the volunteer web client.
 * Wraps the config in the next-intl plugin so locale-aware routing and
 * message loading are available to both Server and Client Components.
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Pin the workspace root — the repo has several lockfiles, and Turbopack
  // otherwise guesses. Must be absolute. `import.meta.dirname` would need
  // Node 20.11+; this form works on every Node 20 Next supports.
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default withNextIntl(nextConfig);
