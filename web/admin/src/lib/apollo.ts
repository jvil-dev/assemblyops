/**
 * Apollo Client
 *
 * Configures the Apollo GraphQL client with an HTTP link to
 * NEXT_PUBLIC_API_URL and an auth link that attaches the JWT
 * Bearer token from localStorage on every request.
 *
 * Options:
 *   - Default fetch policy: network-only (no stale cache)
 *
 * Exports: apolloClient
 *
 * Used by: ApolloWrapper
 */
import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_API_URL,
});

const authLink = setContext((_, { headers }) => {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('admin_token')
    : null;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

export const apolloClient = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: { fetchPolicy: 'network-only' },
  },
});
