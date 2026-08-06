/**
 * Login Route Tests
 *
 * Covers both login outcomes: valid credentials store the token and reach the
 * home route, and rejected credentials surface inline without navigating.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { LoginUserMutation, MeQuery } from '@/lib/operations';

const EMAIL = 'maria@example.org';
const PASSWORD = 'correct-horse-battery';
const TOKEN_KEY = 'assemblyops.accessToken';

const VOLUNTEER = { __typename: 'User', id: 'u1', firstName: 'Maria' };

const loginSucceeds = {
  request: {
    query: LoginUserMutation,
    variables: { input: { email: EMAIL, password: PASSWORD } },
  },
  result: {
    data: {
      loginUser: {
        __typename: 'UserAuthPayload',
        accessToken: 'test-access-token',
        user: VOLUNTEER,
      },
    },
  },
};

const meResolves = {
  request: { query: MeQuery },
  result: { data: { me: VOLUNTEER } },
};

// Matches the backend, which returns UNAUTHENTICATED with this exact message
// for both an unknown email and a wrong password.
const loginRejected = {
  request: {
    query: LoginUserMutation,
    variables: { input: { email: EMAIL, password: 'wrong-password' } },
  },
  result: {
    errors: [
      new GraphQLError('Invalid email or password', {
        extensions: { code: 'UNAUTHENTICATED' },
      }),
    ],
  },
};

function renderApp(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mocks={mocks} mockLinkDefaultOptions={{ delay: 0 }}>
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    </MockedProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

it('stores the token and greets the volunteer on valid credentials', async () => {
  renderApp([loginSucceeds, meResolves]);

  await userEvent.type(screen.getByLabelText('Email'), EMAIL);
  await userEvent.type(screen.getByLabelText('Password'), PASSWORD);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

  expect(
    await screen.findByRole('heading', { name: /Hello, Maria/ })
  ).toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_KEY)).toBe('test-access-token');
});

it('shows an inline error and stays on the form for bad credentials', async () => {
  renderApp([loginRejected]);

  await userEvent.type(screen.getByLabelText('Email'), EMAIL);
  await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Invalid email or password'
  );
  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
});
