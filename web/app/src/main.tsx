/**
 * Application Entry
 *
 * Mounts the React tree and supplies the two contexts every route needs:
 * the Apollo GraphQL client and the browser router.
 *
 * Dependencies: App, lib/apollo
 */
import { StrictMode } from 'react';
import { ApolloProvider } from '@apollo/client/react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/App';
import { apolloClient } from '@/lib/apollo';
import '@/globals.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ApolloProvider>
  </StrictMode>
);
