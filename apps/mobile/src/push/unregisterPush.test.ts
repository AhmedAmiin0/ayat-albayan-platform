import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { TOKEN_KEY, unregisterPush } from './registerPush';

jest.mock('@/lib/env', () => ({ env: { apiUrl: 'http://api' } }));

const TOKEN = 'ExponentPushToken[abc-123]';
const PATH = `http://api/me/push-tokens/${encodeURIComponent(TOKEN)}`;
const mockFetch = jest.fn();

beforeEach(async () => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
  await AsyncStorage.clear();
});
afterEach(() => jest.useRealTimers());

test('DELETE with the leaving bearer, never the current session, then forget the token', async () => {
  await AsyncStorage.setItem(TOKEN_KEY, TOKEN);
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
  await unregisterPush('jwt-leaving', 3000);
  const [url, init] = mockFetch.mock.calls[0];
  expect(url).toBe(PATH);
  expect(init.method).toBe('DELETE');
  expect(new Headers(init.headers).get('Authorization')).toBe('Bearer jwt-leaving');
  // By the time a late DELETE runs, the stored session may be the next user's.
  expect(supabase.auth.getSession).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
});

test('nothing registered, nothing sent', async () => {
  await unregisterPush('jwt-leaving', 3000);
  expect(mockFetch).not.toHaveBeenCalled();
});

test('offline or refused: never throws and keeps the token for the next sign-out', async () => {
  await AsyncStorage.setItem(TOKEN_KEY, TOKEN);
  mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(unregisterPush('jwt-leaving', 3000)).resolves.toBeUndefined();
  mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));
  await expect(unregisterPush('jwt-expired', 3000)).resolves.toBeUndefined();
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe(TOKEN);
});

test('a hung DELETE is aborted after the limit: nothing is left to answer later', async () => {
  jest.useFakeTimers();
  await AsyncStorage.setItem(TOKEN_KEY, TOKEN);
  let signal: AbortSignal | undefined;
  mockFetch.mockImplementationOnce(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        signal = init.signal ?? undefined;
        signal?.addEventListener('abort', () => reject(new Error('Aborted')));
      }),
  );
  const done = unregisterPush('jwt-leaving', 3000);
  await jest.advanceTimersByTimeAsync(3000);
  await expect(done).resolves.toBeUndefined();
  expect(signal?.aborted).toBe(true);
  // Kept for the next sign-out (and a later sign-in's own key is never dropped by this one).
  expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe(TOKEN);
});
