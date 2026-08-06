/**
 * Vitest Setup
 *
 * Installs the Testing Library DOM matchers (toBeInTheDocument, toHaveValue, …)
 * so every test file gets them without importing.
 *
 * Used by: vite.config.ts (test.setupFiles)
 */
import '@testing-library/jest-dom/vitest';
