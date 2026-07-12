/**
 * Apollo Wrapper
 *
 * Client component that provides the Apollo GraphQL context to the
 * entire app. Wraps children in ApolloProvider with the shared client.
 *
 * Dependencies: ../lib/apollo
 *
 * Used by: layout.tsx (root layout)
 */
'use client';
import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from '../lib/apollo';

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
