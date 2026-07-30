/**
 * Apollo Client
 *
 * Configures the Apollo GraphQL client for the volunteer web client.
 * Attaches the stored access token to every operation.
 *
 * Environment Variables:
 *   - VITE_API_URL: GraphQL endpoint (default http://localhost:4000/graphql)
 *
 * Exports: apolloClient, GRAPHQL_HTTP_URL
 *
 * Used by: main.tsx
 */
import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { getToken } from "@/lib/auth";

export const GRAPHQL_HTTP_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:4000/graphql";

const httpLink = new HttpLink({ uri: GRAPHQL_HTTP_URL });

// The backend requires the exact "Bearer " prefix. When signed out we send no
// header at all, so `me` resolves to null rather than failing to parse.
const authLink = new SetContextLink((prevContext) => {
  const token = getToken();
  if (!token) return prevContext;

  return {
    ...prevContext,
    headers: { ...prevContext.headers, authorization: `Bearer ${token}` },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
