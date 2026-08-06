/**
 * Apollo Client Tests
 *
 * Covers the auth link, which is what keeps a volunteer signed in across a
 * reload. The backend requires the exact "Bearer " prefix and treats a missing
 * header as signed out, so both cases are asserted against a stubbed fetch.
 */
import { apolloClient } from '@/lib/apollo';
import { MeQuery } from '@/lib/operations';

const TOKEN_KEY = 'assemblyops.accessToken';

function stubFetch() {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          data: { me: { __typename: 'User', id: 'u1', firstName: 'Maria' } },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** HttpLink passes headers as a plain object on the request init. */
function authorizationHeader(fetchMock: ReturnType<typeof stubFetch>) {
  const init = fetchMock.mock.calls[0][1];
  return new Headers(init?.headers).get('authorization');
}

beforeEach(() => {
  localStorage.clear();
  apolloClient.stop();
  return apolloClient.clearStore();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it('sends the stored token as a Bearer header', async () => {
  localStorage.setItem(TOKEN_KEY, 'stored-token');
  const fetchMock = stubFetch();

  await apolloClient.query({ query: MeQuery, fetchPolicy: 'no-cache' });

  expect(authorizationHeader(fetchMock)).toBe('Bearer stored-token');
});

it('sends no authorization header when signed out', async () => {
  const fetchMock = stubFetch();

  await apolloClient.query({ query: MeQuery, fetchPolicy: 'no-cache' });

  expect(authorizationHeader(fetchMock)).toBeNull();
});
