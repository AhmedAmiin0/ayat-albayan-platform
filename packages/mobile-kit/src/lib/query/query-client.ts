import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAuthExit, shouldRetry } from '@ab/client-core';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { setLoginNotice } from '../../auth/login-notice';
import { measuredStorage } from '../log/boot';
import { supabase } from '../http/supabase';

// R-MOB-03: reads survive a restart or a dead connection (the last good answer stays on screen).
const DAY = 24 * 60 * 60 * 1000;

/** The auth gate then shows /login and clears the caches; a disabled account leaves its reason. */
export const signOutOnAuthError = createAuthExit({
  signOut: () => supabase.auth.signOut(),
  onDisabled: () => setLoginNotice('accountDisabled'),
});

// RN has no window focus event: back in the foreground, mounted stale lists refetch (tabs stay
// mounted, so nothing else would). TanStack's React Native recipe.
focusManager.setEventListener((setFocused) => {
  const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => sub.remove();
});

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: signOutOnAuthError }),
  mutationCache: new MutationCache({ onError: signOutOnAuthError }),
  // gcTime must be at least the persist maxAge, or restored queries are collected before use.
  defaultOptions: {
    queries: { gcTime: DAY, retry: shouldRetry, networkMode: 'offlineFirst' },
    mutations: { networkMode: 'always' },
  },
});

/** Foreground re-reads use resumeInbox only (docs/43 AU3); a focus refetch would be cancelled. */
export const RESUME_OWNED: readonly string[][] = [['threads'], ['chat-lists']];
const NO_FOCUS_REFETCH = { refetchOnWindowFocus: false } as const;
for (const queryKey of RESUME_OWNED) queryClient.setQueryDefaults(queryKey, NO_FOCUS_REFETCH);

/**
 * The whole cache is one AsyncStorage value, written at most every 5 s (docs/43 AU11;
 * TanStack's default 1 s re-stringified it on nearly every poll). A kill within 5 s of a
 * change loses only that change: the next start re-reads it.
 */
export const PERSIST_THROTTLE_MS = 5_000;

export const persister = createAsyncStoragePersister({
  storage: measuredStorage(AsyncStorage),
  key: 'ab-query-cache',
  throttleTime: PERSIST_THROTTLE_MS,
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
      query.state.data !== undefined && query.meta?.noPersist !== true,
  },
};

let markRestored: () => void = () => undefined;
/**
 * Settles once PersistQueryClientProvider has put the saved cache back (or given up): app/_layout.
 */
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
