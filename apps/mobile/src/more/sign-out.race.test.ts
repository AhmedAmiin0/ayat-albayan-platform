import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { release, resetServer, server, sessionFor, STORAGE_KEY, storedUser } from '@/test/auth-server';
import { signOutDevice } from './sign-out';

// The real auth-js client: a sign-out step left running after its timeout (the gate has shown
// /login meanwhile) must never reach a session signed in after it, nor the next user's account.
jest.mock('@/lib/supabase', () => jest.requireActual('@/test/auth-server'));
jest.mock('@/push/registerPush', () => ({ unregisterPush: jest.fn(async () => undefined) }));

const events: string[] = [];

beforeAll(async () => {
  await supabase.auth.initialize();
  supabase.auth.onAuthStateChange((event, session) => {
    events.push(`${event}:${session?.user.id ?? '-'}`);
  });
});

beforeEach(async () => {
  resetServer();
  await AsyncStorage.clear();
  jest.useFakeTimers();
  // INITIAL_SESSION of the subscription above, and anything a previous test left.
  await jest.advanceTimersByTimeAsync(0);
  events.length = 0;
});
afterEach(() => jest.useRealTimers());

/** The next user signs in on this device once it shows /login. */
async function nextUserSignsIn(): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: 'user-2', password: 'x' });
  expect(error).toBeNull();
  expect(await storedUser()).toBe('user-2');
}

test('the client is the one sign-out reads its storage key from', () => {
  expect(Reflect.get(supabase.auth, 'storageKey')).toBe(STORAGE_KEY);
});

test('a /logout still pending after the timeout cannot sign the next user out', async () => {
  server.holdLogout = true;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessionFor('user-1', 3600)));
  const leaving = signOutDevice();
  await jest.advanceTimersByTimeAsync(30_000);
  await leaving;
  expect(await storedUser()).toBeNull();
  expect(events).toEqual(['SIGNED_OUT:-']);

  await nextUserSignsIn();
  release();
  await jest.advanceTimersByTimeAsync(30_000);
  expect(await storedUser()).toBe('user-2');
  expect(events).toEqual(['SIGNED_OUT:-', 'SIGNED_IN:user-2']);
  // Only the leaving session, by its own token, was ever ended on the server.
  expect(server.logouts).toEqual([{ bearer: 'user-1-access-1', scope: 'local' }]);
});

test('offline with an expired token: the refresh left retrying cannot reach the next user', async () => {
  server.online = false;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessionFor('user-1', -60)));
  const leaving = signOutDevice();
  await jest.advanceTimersByTimeAsync(10_000);
  await leaving;
  expect(await storedUser()).toBeNull();
  expect(events).toEqual(['SIGNED_OUT:-']);

  // The network is back: the next user signs in, then the old refresh succeeds (auth-js discards it).
  server.online = true;
  await nextUserSignsIn();
  await jest.advanceTimersByTimeAsync(60_000);
  expect(server.refreshed).toEqual(['user-1']);
  expect(await storedUser()).toBe('user-2');
  expect(events).toEqual(['SIGNED_OUT:-', 'SIGNED_IN:user-2']);
  expect(server.logouts).toEqual([]);
});

test('online with a valid token: this session ends on the server too, then the device is left', async () => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessionFor('user-1', 3600)));
  await signOutDevice();
  expect(server.logouts).toEqual([{ bearer: 'user-1-access-1', scope: 'local' }]);
  expect(await storedUser()).toBeNull();
  expect(events).toEqual(['SIGNED_OUT:-']);
});
