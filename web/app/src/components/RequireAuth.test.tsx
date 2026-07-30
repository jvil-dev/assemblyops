/**
 * Auth Guard Tests
 *
 * Covers the two ways a visit to a guarded route ends up back at /login:
 * no token at all, and a token the backend no longer accepts.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { LoginUserMutation, MeQuery } from '@/lib/operations';

const TOKEN_KEY = 'assemblyops.accessToken';
const EMAIL = 'maria@example.org';
const PASSWORD = 'correct-horse-battery';

const VOLUNTEER = { __typename: 'User', id: 'u1', firstName: 'Maria' };

// An expired token is not an error on the backend — the context builder
// swallows it and `me` comes back null.
const meRejectsToken = {
  request: { query: MeQuery },
  result: { data: { me: null } },
};

// Assembly-day venues have unreliable wifi, so a failed request must not be
// mistaken for the backend rejecting the token.
const meFailsToReach = {
  request: { query: MeQuery },
  error: new Error('Failed to fetch'),
};

function renderAtHome(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mocks={mocks} mockLinkDefaultOptions={{ delay: 0 }}>
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    </MockedProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

it('redirects to the login form when no token is stored', async () => {
  renderAtHome([]);

  expect(
    await screen.findByRole('heading', { name: 'Sign in' })
  ).toBeInTheDocument();
});

it('clears a stale token and redirects when me resolves to null', async () => {
  localStorage.setItem(TOKEN_KEY, 'expired-token');

  renderAtHome([meRejectsToken]);

  expect(
    await screen.findByRole('heading', { name: 'Sign in' })
  ).toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
});

it('keeps the session and offers a retry when me cannot be reached', async () => {
  localStorage.setItem(TOKEN_KEY, 'valid-token');

  renderAtHome([meFailsToReach]);

  expect(
    await screen.findByRole('button', { name: /try again/i })
  ).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Sign in' })).toBeNull();
  expect(localStorage.getItem(TOKEN_KEY)).toBe('valid-token');
});

it('lets a rejected volunteer sign back in without reloading the page', async () => {
  localStorage.setItem(TOKEN_KEY, 'expired-token');

  renderAtHome([
    meRejectsToken,
    {
      request: {
        query: LoginUserMutation,
        variables: { input: { email: EMAIL, password: PASSWORD } },
      },
      result: {
        data: {
          loginUser: {
            __typename: 'UserAuthPayload',
            accessToken: 'fresh-access-token',
            user: VOLUNTEER,
          },
        },
      },
    },
    { request: { query: MeQuery }, result: { data: { me: VOLUNTEER } } },
  ]);

  // The stale token bounces us to the form.
  await screen.findByRole('heading', { name: 'Sign in' });

  await userEvent.type(screen.getByLabelText('Email'), EMAIL);
  await userEvent.type(screen.getByLabelText('Password'), PASSWORD);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

  // Without evicting the rejected `me: null`, the guard reads it straight back
  // out of the cache and bounces the brand-new token too.
  expect(
    await screen.findByRole('heading', { name: /Hello, Maria/ })
  ).toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_KEY)).toBe('fresh-access-token');
});
