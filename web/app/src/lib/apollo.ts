/**
 * Apollo Client
 *
 * Configures the Apollo GraphQL client for the volunteer web client.
 * Queries and mutations travel over HTTP; subscriptions travel over the
 * graphql-ws protocol, which the backend mounts on the same path.
 *
 * Environment Variables:
 *   - NEXT_PUBLIC_API_URL: GraphQL endpoint (default http://localhost:4000/graphql)
 *
 * Exports: apolloClient, GRAPHQL_HTTP_URL
 *
 * Used by: ApolloWrapper
 */
import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

export const GRAPHQL_HTTP_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';

/** graphql-ws shares the HTTP path, so only the scheme changes. */
const GRAPHQL_WS_URL = GRAPHQL_HTTP_URL.replace(/^http/, 'ws');

const httpLink = new HttpLink({ uri: GRAPHQL_HTTP_URL });

// WebSocket is browser-only; during SSR every operation takes the HTTP link.
const wsLink =
  typeof window === 'undefined'
    ? null
    : new GraphQLWsLink(createClient({ url: GRAPHQL_WS_URL }));

const link = wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        );
      },
      wsLink,
      httpLink
    )
  : httpLink;

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});
