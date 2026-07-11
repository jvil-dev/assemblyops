/**
 * Auth Hook
 *
 * Manages admin authentication state, login, and logout.
 * Checks localStorage for existing tokens on mount and validates
 * the isAppAdmin flag before granting access.
 *
 * Returns:
 *   - user: Current AdminUser or null
 *   - isLoading: True during initial auth check
 *   - isAuthenticated: True if user is logged in
 *   - login(email, password): Authenticate and redirect to /
 *   - logout(): Clear tokens and redirect to /login
 *
 * Dependencies: ../lib/auth, ../lib/queries (LOGIN_USER mutation)
 *
 * Used by: AuthGuard, Sidebar, Login page
 */
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { getStoredToken, getStoredUser, storeAuth, clearAuth, isTokenExpired, AdminUser } from '../lib/auth';
import { LOGIN_USER } from '../lib/queries';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginMutation] = useMutation<{
    loginUser: {
      user: AdminUser;
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  }>(LOGIN_USER);

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();
    if (token && !isTokenExpired(token) && storedUser?.isAppAdmin) {
      setUser(storedUser);
    } else {
      clearAuth();
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await loginMutation({ variables: { input: { email, password } } });
    const payload = data?.loginUser;
    if (!payload?.user?.isAppAdmin) {
      throw new Error('This account does not have admin access');
    }
    storeAuth(payload.accessToken, payload.user);
    setUser(payload.user);
    router.push('/');
  }, [loginMutation, router]);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    router.push('/login');
  }, [router]);

  return { user, isLoading, isAuthenticated: !!user, login, logout };
}
