/**
 * Vite Environment Types
 *
 * Pulls in Vite's client types and declares the env vars this app reads,
 * so `import.meta.env.VITE_API_URL` is typed rather than `any`.
 */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** GraphQL endpoint. Defaults to http://localhost:4000/graphql when unset. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
