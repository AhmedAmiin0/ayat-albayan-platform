import AsyncStorage from '@react-native-async-storage/async-storage';
import { dehydrate, focusManager, QueryClient, QueryObserver } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { ApiError } from './api';
import {
  clearQueryCaches,
  persistOptions,
  persister,
  queryClient,
  shouldRetry,
  signOutOnAuthError,
} from './query-client';

const mockSignOut = jest.fn();
const mockSetNotice = jest.fn();
jest.mock('@/auth/login-notice', () => ({
  ...jest.requireActual('@/auth/login-notice'),
  setLoginNotice: (n: unknown) => mockSetNotice(n),
}));
jest.mock('./supabase', () => ({ supabase: { auth: { signOut: () => mockSignOut() } } }));

// query-client registers its AppState listener on import: keep it before clearAllMocks wipes it.
const onAppState = jest.mocked(AppState.addEventListener).mock.calls[0]?.[1];

beforeEach(() => jest.clearAllMocks());

test('back in the foreground, mounted queries refetch (RN has no window focus event)', async () => {
  const client = new QueryClient();
  client.mount();
  const queryFn = jest.fn(async () => 'fresh');
  const unsubscribe = new QueryObserver(client, { queryKey: ['focus'], queryFn }).subscribe(() => undefined);
  await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));
  onAppState?.('background');
  expect(focusManager.isFocused()).toBe(false);
  onAppState?.('active');
  await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
  unsubscribe();
  client.unmount();
  client.clear();
});

test('4xx is final, network errors and 5xx retry up to three times', () => {
  expect(shouldRetry(0, new ApiError(401))).toBe(false);
  expect(shouldRetry(0, new ApiError(404))).toBe(false);
  expect(shouldRetry(0, new ApiError(503))).toBe(true);
  expect(shouldRetry(2, new TypeError('Network request failed'))).toBe(true);
  expect(shouldRetry(3, new TypeError('Network request failed'))).toBe(false);
});

test('a 403 account_disabled signs out and leaves the reason for the login screen', () => {
  signOutOnAuthError(new ApiError(403, { code: 'account_disabled' }));
  expect(mockSignOut).toHaveBeenCalledTimes(1);
  expect(mockSetNotice).toHaveBeenCalledWith('accountDisabled');
});

test('a plain 403 (a permission the role lacks) or another 403 code keeps the session', () => {
  signOutOnAuthError(new ApiError(403, { code: 'permission_not_held' }));
  signOutOnAuthError(new ApiError(403, 'account_disabled'));
  expect(mockSignOut).not.toHaveBeenCalled();
  expect(mockSetNotice).not.toHaveBeenCalled();
});

test('only a 401 or a disabled account signs out', () => {
  signOutOnAuthError(new ApiError(403));
  signOutOnAuthError(new TypeError('offline'));
  expect(mockSignOut).not.toHaveBeenCalled();
  signOutOnAuthError(new ApiError(401));
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

test('a query marked noPersist (a signed URL) never reaches the disk cache', () => {
  const client = new QueryClient();
  client.setQueryData(['leads', 'list', {}], { pages: [], pageParams: [] });
  client.getQueryCache().build(client, { queryKey: ['threads', 'x', 'media'], meta: { noPersist: true } });
  client.setQueryData(['threads', 'x', 'media'], [{ message_id: 'm' }]);
  const saved = dehydrate(client, persistOptions.dehydrateOptions).queries.map((q) => q.queryKey);
  expect(saved).toEqual([['leads', 'list', {}]]);
  client.clear();
});
