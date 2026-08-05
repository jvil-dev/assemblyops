/**
 * Auth Token Store
 *
 * Reads and writes the volunteer's access token. localStorage is the store
 * for now; #197 moves the session off it and replaces this file.
 *
 * Exports: getToken, setToken, clearToken, useToken, subscribeToOtherTabToken
 *
 * Used by: lib/apollo, RequireAuth, LoginPage, HomePage
 */
import { useSyncExternalStore } from 'react';

const ACCESS_TOKEN_KEY = 'assemblyops.accessToken';

const listeners = new Set<() => void>();
const otherTabListeners = new Set<() => void>();

function notify(set: Set<() => void>): void {
  for (const listener of set) listener();
}

// A `storage` event fires only in the tabs that did not write, so this is the
// cross-tab signal. `key === null` is localStorage.clear().
function handleStorage(event: StorageEvent): void {
  if (event.key !== ACCESS_TOKEN_KEY && event.key !== null) return;
  notify(listeners);
  notify(otherTabListeners);
}

function subscribe(set: Set<() => void>, listener: () => void): () => void {
  const wasEmpty = listeners.size === 0 && otherTabListeners.size === 0;
  set.add(listener);
  if (wasEmpty) window.addEventListener('storage', handleStorage);

  return () => {
    set.delete(listener);
    if (listeners.size === 0 && otherTabListeners.size === 0) {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  notify(listeners);
}

export function clearToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  notify(listeners);
}

/** Reactive read — re-renders when this tab or another one changes the token. */
export function useToken(): string | null {
  return useSyncExternalStore(
    (listener) => subscribe(listeners, listener),
    getToken
  );
}

/** Fires only when a different tab signs in or out. */
export function subscribeToOtherTabToken(listener: () => void): () => void {
  return subscribe(otherTabListeners, listener);
}
