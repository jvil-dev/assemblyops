/**
 * GraphQL Code Generator Configuration
 *
 * Generates typed GraphQL operations from the documents in src/ against the
 * live dev schema. Output is committed, so builds and CI never need a
 * running backend — only `npm run codegen` does.
 *
 * Usage:
 *   cd backend && npm run dev     # introspection is on when NODE_ENV != production
 *   cd web/app && npm run codegen
 */
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql',
  documents: ['src/**/*.{ts,tsx}', '!src/gql/**/*'],
  ignoreNoDocuments: true,
  // The DateTime scalar serializes to an ISO string over the wire.
  config: { scalars: { DateTime: 'string' } },
  generates: {
    // Default client-preset output is TypedDocumentNode, which is what
    // Apollo's useQuery expects.
    './src/gql/': {
      preset: 'client',
    },
  },
};

export default config;
