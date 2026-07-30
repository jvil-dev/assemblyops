/**
 * Vite Configuration
 *
 * Build, dev-server, and test configuration for the volunteer web client.
 *
 * Notes:
 *   - Port 3001 is deliberate. The backend CORS allowlist matches origins
 *     exactly and hard-403s anything else, and it already includes 3001.
 *   - build.target mirrors the browserslist key in package.json.
 */
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const PORT = 3001;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: PORT, strictPort: true },
  preview: { port: PORT, strictPort: true },
  build: {
    target: ['safari16', 'chrome111', 'edge111', 'firefox115'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
