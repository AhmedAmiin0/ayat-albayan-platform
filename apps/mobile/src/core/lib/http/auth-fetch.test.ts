import { connectivity } from '@/core/lib/connectivity/connectivity';
import { AUTH_TIMEOUT_MS, authFetch } from './auth-fetch';

// Supabase's transport: a token refresh stuck on a dead connection settles at the deadline (every
// apiFetch and the realtime setAuth wait for it); writes and Storage uploads keep no deadline.

const BASE = 'https://x.supabase.co';
const REFRESH = `${BASE}/auth/v1/token?grant_type=refresh_token`;
const mockFetch = jest.fn();
const never = () => new Promise<never>(() => undefined);
beforeEach(() => {
  jest.useFakeTimers();
  mockFetch.mockReset().mockImplementation(never);
  globalThis.fetch = mockFetch;
  jest.mocked(connectivity.reportFailure).mockClear();
});
afterEach(() => jest.useRealTimers());

async function settlesAt(call: Promise<Response>, ms: number) {
  const settled = expect(call).rejects.toBeInstanceOf(TypeError);
  await jest.advanceTimersByTimeAsync(ms);
  await settled;
  // A hung session read is the token stage: not the API's connection (no «connecting» bar).
  expect(connectivity.reportFailure).not.toHaveBeenCalled();
}

async function stillWaiting(call: Promise<Response>) {
  const onDone = jest.fn();
  void call.then(onDone, onDone);
  await jest.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS * 3);
  expect(onDone).not.toHaveBeenCalled();
}

test('a stuck token refresh rejects as no answer at AUTH_TIMEOUT_MS, not before', async () => {
  const refresh = authFetch(REFRESH, { method: 'POST' });
  const onDone = jest.fn();
  void refresh.then(onDone, onDone);
  await jest.advanceTimersByTimeAsync(AUTH_TIMEOUT_MS - 1);
  expect(onDone).not.toHaveBeenCalled();
  await settlesAt(refresh, 1);
});

test('a refresh whose body never arrives still settles', async () => {
  const stuckBody = { status: 200, statusText: 'OK', headers: new Headers(), text: never };
  mockFetch.mockResolvedValue(stuckBody);
  await settlesAt(authFetch(REFRESH, { method: 'POST' }), AUTH_TIMEOUT_MS);
});

test('an answered refresh hands its body over whole', async () => {
  mockFetch.mockResolvedValue(new Response('{"access_token":"t"}', { status: 200 }));
  const res = await authFetch(REFRESH, { method: 'POST' });
  expect(await res.json()).toEqual({ access_token: 't' });
});

test('GET /auth/v1/user gets the deadline too', async () => {
  await settlesAt(authFetch(`${BASE}/auth/v1/user`), AUTH_TIMEOUT_MS);
});

test.each([
  ['a password sign-in', `${BASE}/auth/v1/token?grant_type=password`, 'POST'],
  ['a sign-out', `${BASE}/auth/v1/logout`, 'POST'],
  ['a password change', `${BASE}/auth/v1/user`, 'PUT'],
  ['a Storage upload', `${BASE}/storage/v1/object/receipts/a.jpg`, 'PUT'],
])('%s keeps no deadline', async (_name, url, method) => {
  await stillWaiting(authFetch(url, { method }));
});
