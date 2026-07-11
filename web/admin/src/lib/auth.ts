/**
 * Auth Utilities
 *
 * LocalStorage-based token and user management for admin sessions.
 *
 * Exports:
 *   - AdminUser: Interface for stored user data
 *   - getStoredToken(): Retrieve JWT from localStorage
 *   - storeAuth(token, user): Persist token and user
 *   - clearAuth(): Remove all stored auth data
 *   - getStoredUser(): Parse and return stored AdminUser
 *   - isTokenExpired(token): Check JWT exp claim against current time
 *
 * Used by: useAuth hook, apollo.ts
 */
const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAppAdmin: boolean;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function storeAuth(token: string, user: AdminUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
