import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthRetryableFetchError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { unregisterPush } from '@/push/registerPush';
import { SIGN_OUT_TIMEOUT_MS, signOutDevice, UNREGISTER_TIMEOUT_MS } from './sign-out';

const KEY = 'sb-test-auth-token';

jest.mock('@/push/registerPush', () => ({ unregisterPush: jest.fn() }));
// The client keeps its storage key on a protected field; sign-out reads it at runtime.
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { storageKey: 'sb-test-auth-token', signOut: jest.fn(async () => ({ error: null })) } },
}));

const unregister = jest.mocked(unregisterPush);
const signOut = jest.mocked(supabase.auth.signOut);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.setItem(KEY, '{"access_token":"expired"}');
});
afterEach(() => jest.useRealTimers());

test('removes the push token first (it needs the session), then signs out', async () => {
  const order: string[] = [];
  unregister.mockImplementationOnce(async () => {
    order.push('unregister');
  });
  signOut.mockImplementationOnce(async () => {
    order.push('signOut');
    return { error: null };
  });
  await signOutDevice();
  expect(order).toEqual(['unregister', 'signOut']);
  expect(signOut).toHaveBeenCalledTimes(1);
});

test('a hung DELETE cannot trap the admin: sign-out goes ahead after the timeout', async () => {
  jest.useFakeTimers();
  unregister.mockImplementationOnce(() => new Promise<void>(() => undefined));
  const done = signOutDevice();
  await jest.advanceTimersByTimeAsync(UNREGISTER_TIMEOUT_MS);
  await done;
  expect(signOut).toHaveBeenCalledTimes(1);
});

test('offline with an expired token: the kept session is forgotten here, and signOut runs again', async () => {
  const offline = new AuthRetryableFetchError('Network request failed', 0);
  let storedAtRetry: string | null = 'unread';
  signOut.mockImplementationOnce(async () => ({ error: offline }));
  signOut.mockImplementationOnce(async () => {
    storedAtRetry = await AsyncStorage.getItem(KEY);
    return { error: null };
  });
  await signOutDevice();
  // The second signOut finds no session, so Supabase clears the rest and emits SIGNED_OUT.
  expect(storedAtRetry).toBeNull();
  expect(signOut).toHaveBeenCalledTimes(2);
});

test('a hung signOut (refresh retrying) cannot trap the user: after the timeout the session goes', async () => {
  jest.useFakeTimers();
  signOut.mockImplementationOnce(() => new Promise(() => undefined));
  const done = signOutDevice();
  await jest.advanceTimersByTimeAsync(SIGN_OUT_TIMEOUT_MS);
  await done;
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
  expect(signOut).toHaveBeenCalledTimes(2);
});

test('a signOut that throws still leaves this device', async () => {
  signOut.mockImplementationOnce(async () => {
    throw new Error('storage unavailable');
  });
  await signOutDevice();
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
  expect(signOut).toHaveBeenCalledTimes(2);
});

test('a clean sign-out leaves the storage to Supabase: nothing removed by hand', async () => {
  await signOutDevice();
  expect(await AsyncStorage.getItem(KEY)).not.toBeNull();
  expect(signOut).toHaveBeenCalledTimes(1);
});
