/**
 * Login Route
 *
 * Email and password sign-in for volunteers. Stores the access token on
 * success and hands off to the home route.
 */
import { useState, type FormEvent } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { setToken } from "@/lib/auth";
import { LoginUserMutation } from "@/lib/operations";

const FIELD_CLASSES =
  'min-h-btn-sm rounded-btn border border-divider bg-surface-secondary px-m ' +
  'text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-focus-ring';

export function LoginPage() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [login, { loading, error }] = useMutation(LoginUserMutation);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const { data } = await login({
        variables: { input: { email, password } },
      });
      if (!data) return;
      setToken(data.loginUser.accessToken);
      await client.clearStore();
      navigate('/', { replace: true });
    } catch {
      // Rendered inline from the hook's `error` below.
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[26rem] flex-col justify-center px-screen py-xxl pb-[env(safe-area-inset-bottom)]">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-l rounded-card bg-surface p-card shadow-card"
      >
        <header className="flex flex-col gap-xs">
          <h1 className="text-large-title font-semibold text-primary">
            Sign in
          </h1>
          <p className="text-subheadline text-ink-secondary">
            Use the email and password from your volunteer account.
          </p>
        </header>

        <div className="flex flex-col gap-xs">
          <label htmlFor="email" className="text-caption uppercase text-ink-secondary">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={FIELD_CLASSES}
          />
        </div>

        <div className="flex flex-col gap-xs">
          <label htmlFor="password" className="text-caption uppercase text-ink-secondary">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={FIELD_CLASSES}
          />
        </div>

        {error && (
          <p role="alert" className="text-subheadline text-declined-text">
            {error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="min-h-btn-md rounded-btn bg-primary px-l text-body font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
