/**
 * Next.js Configuration
 *
 * Build and runtime configuration for the volunteer web client.
 */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pin the workspace root — the repo has several lockfiles, and Turbopack
  // otherwise guesses. Must be absolute.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
