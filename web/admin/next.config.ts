/**
 * Next.js Configuration
 *
 * Build and runtime configuration for the admin portal.
 * Uses Turbopack for fast local development.
 */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
};

export default nextConfig;
