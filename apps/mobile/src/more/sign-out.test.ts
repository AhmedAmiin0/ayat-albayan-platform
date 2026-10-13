import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthRetryableFetchError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { unregisterPush } from '@/push/registerPush';
import { SESSION_TIMEOUT_MS, SIGN_OUT_TIMEOUT_MS, signOutDevice, UNREGISTER_TIMEOUT_MS } from './sign-out';

// sign-out.race.test.ts runs the same flow on the real auth-js client.
const KEY = 'sb-test-auth-token';
const session = { access_token: 'jwt-1' };
const mockGetSession = jest.fn();

jest.mock('@/push/registerPush', () => ({ unregisterPush: jest.fn(async () => undefined) }));
// The client keeps its storage key on a protected field; sign-out reads it at runtime.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      storageKey: 'sb-test-auth-token',
      getSession: () => mockGetSession(),
      signOut: jest.fn(async () => ({ error: null })),
      admin: { signOut: jest.fn(async () => ({ data: null, error: null })) },
    },
  },
}));

const unregister = jest.mocked(unregisterPush);
const signOut = jest.mocked(supabase.auth.signOut);
const revoke = jest.mocked(supabase.auth.admin.signOut);
const hang = () => new Promise<never>(() => undefined);

/** What signOut found in storage when it ran: it must find no session (so it sends nothing). */
let storedAtSignOut: string | null | undefined;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.setItem(KEY, '{"access_token":"jwt-1"}');
  mockGetSession.mockResolvedValue({ data: { session }, error: null });
  storedAtSignOut = undefined;
  signOut.mockImplementation(async () => {
    storedAtSignOut = await AsyncStorage.getItem(KEY);
    return { error: null };
  });
});
afterEach(() => jest.useRealTimers());

/** The device was left: session gone from storage, then one local signOut (SIGNED_OUT). */
function expectLeft(): void {
  expect(storedAtSignOut).toBeNull();
  expect(signOut).toHaveBeenCalledTimes(1);
  expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
}

test('push token first, then this session ends on the server, both by its own token, then the device is left', async () => {
  const order: string[] = [];
  unregister.mockImplementationOnce(async () => void order.push('unregister'));
  revoke.mockImplementationOnce(async () => {
    order.push('revoke');
    return { data: null, error: null };
  });
  await signOutDevice();
  expect(order).toEqual(['unregister', 'revoke']);
  expect(unregister).toHaveBeenCalledWith('jwt-1', UNREGISTER_TIMEOUT_MS);
  expect(revoke).toHaveBeenCalledWith('jwt-1', 'local');
  expectLeft();
});

test('no session: nothing to send, the device is still left', async () => {
  mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
  await signOutDevice();
  expect(unregister).not.toHaveBeenCalled();
  expect(revoke).not.toHaveBeenCalled();
  expectLeft();
});

test('offline with an expired token (getSession retrying its refresh): left after the timeout', async () => {
  jest.useFakeTimers();
  mockGetSession.mockImplementationOnce(hang);
  const done = signOutDevice();
  await jest.advanceTimersByTimeAsync(SESSION_TIMEOUT_MS);
  await done;
  expect(unregister).not.toHaveBeenCalled();
  expect(revoke).not.toHaveBeenCalled();
  expectLeft();
});

test('the server answers with an AuthRetryableFetchError: the device is left anyway', async () => {
  const offline = new AuthRetryableFetchError('Network request failed', 0);
  revoke.mockResolvedValueOnce({ data: null, error: offline });
  await signOutDevice();
  expectLeft();
});

test('a hung /logout cannot trap the user: after the timeout the device is left', async () => {
  jest.useFakeTimers();
  revoke.mockImplementationOnce(hang);
  const done = signOutDevice();
  await jest.advanceTimersByTimeAsync(SIGN_OUT_TIMEOUT_MS);
  await done;
  expectLeft();
});

test('a throw anywhere (getSession, the server call, signOut) never escapes', async () => {
  mockGetSession.mockRejectedValueOnce(new Error('storage unavailable'));
  signOut.mockRejectedValueOnce(new Error('storage unavailable'));
  await expect(signOutDevice()).resolves.toBeUndefined();
  revoke.mockRejectedValueOnce(new Error('fetch polyfill'));
  await expect(signOutDevice()).resolves.toBeUndefined();
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
});
