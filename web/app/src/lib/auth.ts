/**
 * Auth Token Store
 *
 * Reads and writes the volunteer's access token. localStorage is the store
 * for now; #197 moves the session off it and replaces this file.
 *
 * Exports: getToken, setToken, clearToken
 *
 * Used by: lib/apollo, RequireAuth, LoginPage, HomePage
 */
const ACCESS_TOKEN_KEY = "assemblyops.accessToken";

export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}
