/**
 * Home Route
 *
 * Greets the signed-in volunteer and offers a way back out. Reads `me` from
 * the Apollo cache, which RequireAuth has already populated.
 */
import { useApolloClient, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { clearToken } from '@/lib/auth';
import { MeQuery } from '@/lib/operations';

export function HomePage() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const { data } = useQuery(MeQuery);

  async function handleSignOut() {
    clearToken();
    await client.clearStore();
    navigate('/login', { replace: true });
  }

  return (
    <main className="mx-auto flex max-w-[36rem] flex-col gap-xl px-screen py-xxl pb-[env(safe-area-inset-bottom)]">
      <header className="flex flex-col gap-s">
        <h1 className="text-large-title font-semibold text-primary">
          Hello, {data?.me?.firstName}
        </h1>
        <p className="text-subheadline text-ink-secondary">
          You are signed in to AssemblyOps.
        </p>
      </header>

      <button
        type="button"
        onClick={handleSignOut}
        className="min-h-btn-sm self-start rounded-btn border border-divider px-l text-body font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Sign out
      </button>
    </main>
  );
}