import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { isAccountDisabled, setLoginNotice } from '@/auth/login-notice';
import { isNetworkError } from '../connectivity/network-error';
import { ApiError } from '../http/api';
import { supabase } from '../http/supabase';

// R-MOB-03: reads survive a restart or a dead connection (the last good answer stays on screen).
const DAY = 24 * 60 * 60 * 1000;

/**
 * A 4xx never succeeds on retry; a 5xx gets TanStack's default three tries. A request with no answer
 * is not retried: the connection probe takes over (lib/connectivity) and the reconnect refetches.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  if (isNetworkError(error)) return false;
  return failureCount < 3;
}

/**
 * Expired or revoked session (401), or an account an admin disabled mid-session (403 `account_disabled`):
 * sign out; the auth gate then shows /login and clears the caches. A disabled account leaves its reason
 * for the login screen. Any other 403 (a permission the role lacks) keeps the session.
 */
export function signOutOnAuthError(error: unknown): void {
  if (isAccountDisabled(error)) setLoginNotice('accountDisabled');
  else if (!(error instanceof ApiError && error.status === 401)) return;
  void supabase.auth.signOut();
}

// RN has no window focus event: back in the foreground, mounted stale lists refetch (tabs stay
// mounted, so nothing else would). TanStack's React Native recipe.
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => sub.remove();
});

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: signOutOnAuthError }),
  mutationCache: new MutationCache({ onError: signOutOnAuthError }),
  // gcTime must be ≥ the persist maxAge, or restored queries are collected before a screen reads them.
  // Offline (lib/connectivity sets onlineManager): a query still tries once, so its error keeps the
  // saved list's «آخر تحديث» note and the offline messages; a 5xx retry waits for the connection, and
  // the reconnect refetches. Saves are never parked: they fail at once with their offline message.
  defaultOptions: {
    queries: { gcTime: DAY, retry: shouldRetry, networkMode: 'offlineFirst' },
    mutations: { networkMode: 'always' },
  },
});

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ab-query-cache',
});

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: DAY,
  // A new app version may change response shapes: its first launch starts from an empty cache.
  buster: Constants.expoConfig?.version ?? 'dev',
  // TanStack saves only `success` queries: the first failed refetch offline would drop the saved
  // list from disk. Keep every query that still holds data, so a restart offline shows it.
  // `meta.noPersist`: signed URLs (booking invoices) would be dead after a restart.
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.state.data !== undefined && query.meta?.['noPersist'] !== true,
  },
};

let markRestored: () => void = () => undefined;
/** Settles once PersistQueryClientProvider has put the saved cache back (or given up): app/_layout. */
export const cacheRestored = new Promise<void>((resolve) => {
  markRestored = resolve;
});
export const onCacheRestored = (): void => markRestored();

/** Sign-out: nothing of the previous session survives, in memory or on disk. */
export async function clearQueryCaches(): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
  await persister.removeClient();
}
