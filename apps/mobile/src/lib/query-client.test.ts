import AsyncStorage from '@react-native-async-storage/async-storage';
import { dehydrate, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';
import {
  clearQueryCaches,
  persistOptions,
  persister,
  queryClient,
  shouldRetry,
  signOutOn401,
} from './query-client';

const mockSignOut = jest.fn();
jest.mock('./supabase', () => ({ supabase: { auth: { signOut: () => mockSignOut() } } }));

beforeEach(() => jest.clearAllMocks());

test('4xx is final, network errors and 5xx retry up to three times', () => {
  expect(shouldRetry(0, new ApiError(401))).toBe(false);
  expect(shouldRetry(0, new ApiError(404))).toBe(false);
  expect(shouldRetry(0, new ApiError(503))).toBe(true);
  expect(shouldRetry(2, new TypeError('Network request failed'))).toBe(true);
  expect(shouldRetry(3, new TypeError('Network request failed'))).toBe(false);
});

test('only a 401 signs out', () => {
  signOutOn401(new ApiError(403));
  signOutOn401(new TypeError('offline'));
  expect(mockSignOut).not.toHaveBeenCalled();
  signOutOn401(new ApiError(401));
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

test('persisted reads live a day and keep restored queries alive as long', () => {
  expect(persistOptions.maxAge).toBe(24 * 60 * 60 * 1000);
  expect(queryClient.getDefaultOptions().queries?.gcTime).toBe(persistOptions.maxAge);
  expect(typeof persistOptions.buster).toBe('string');
});

test('sign-out clears the memory cache and the persisted copy', async () => {
  queryClient.setQueryData(['students', 'list', {}], { items: [], total: 0 });
  await persister.persistClient({
    timestamp: Date.now(),
    buster: '',
    clientState: { queries: [], mutations: [] },
  });
  // The async-storage persister throttles writes (1s); wait for the flush.
  await new Promise((r) => setTimeout(r, 1100));
  expect(await AsyncStorage.getItem('ab-query-cache')).not.toBeNull();

  await clearQueryCaches();
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  expect(await AsyncStorage.getItem('ab-query-cache')).toBeNull();
});

test('a list whose refetch failed offline is still saved to disk', () => {
  const client = new QueryClient();
  client.setQueryData(['leads', 'list', {}], { pages: [], pageParams: [] });
  client.getQueryCache().find({ queryKey: ['leads', 'list', {}] })?.setState({
    status: 'error',
    error: new ApiError(503),
  });
  client.getQueryCache().build(client, { queryKey: ['never', 'loaded'] });
  const saved = dehydrate(client, persistOptions.dehydrateOptions).queries.map((q) => q.queryKey);
  expect(saved).toEqual([['leads', 'list', {}]]);
  client.clear();
});
