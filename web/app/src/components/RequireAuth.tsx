/**
 * Auth Guard
 *
 * Wraps routes that need a signed-in volunteer. Sends anyone without a valid
 * session to /login.
 *
 * Note: the backend swallows an invalid or expired token and returns
 * `me: null` rather than an error, so an explicit null `me` is the only
 * signed-out signal. A failed request means the API is unreachable, not that
 * the session is bad.
 *
 * Used by: App
 */
import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Navigate } from 'react-router-dom';
import { clearToken, getToken } from '@/lib/auth';
import { MeQuery } from '@/lib/operations';

export function RequireAuth({ children }: { children: ReactNode }) {
  const hasToken = getToken() !== null;
  const { data, loading, error, refetch } = useQuery(MeQuery, {
    skip: !hasToken,
  });
  const rejected = hasToken && !loading && !error && data?.me === null;

  useEffect(() => {
    if (rejected) clearToken();
  }, [rejected]);

  if (!hasToken || rejected) return <Navigate to="/login" replace />;
  if (error) return <UnreachableNotice onRetry={() => void refetch()} />;
  if (loading || !data?.me) return null;

  return <>{children}</>;
}

function UnreachableNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="mx-auto flex max-w-[26rem] flex-col gap-l px-screen py-xxl">
      <h1 className="text-title font-semibold text-primary">
        Can&rsquo;t reach AssemblyOps
      </h1>
      <p className="text-subheadline text-ink-secondary">
        You are still signed in. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-btn-md self-start rounded-btn bg-primary px-l text-body font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Try again
      </button>
    </main>
  );
}