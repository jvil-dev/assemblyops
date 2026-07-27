/**
 * Next.js Configuration
 *
 * Build and runtime configuration for the volunteer web client.
 * Wraps the config in the next-intl plugin so locale-aware routing and
 * message loading are available to both Server and Client Components.
 */
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Pin the workspace root — the repo has several lockfiles, and Turbopack
  // otherwise guesses. Must be absolute.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default withNextIntl(nextConfig);
