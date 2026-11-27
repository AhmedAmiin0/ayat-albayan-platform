import { READ_TIMEOUT_MS, SEND_TIMEOUT_MS } from '@ab/client-core';
import { z } from 'zod';
import { connectivity } from '../connectivity/connectivity';
import { call } from './api';
import { supabase } from './supabase';

// jest.setup.cjs mocks Supabase and connectivity.
jest.mock('./env', () => ({ env: { apiUrl: 'http://api' } }));

const getSession = jest.mocked(supabase.auth.getSession);
const mockFetch = jest.fn();
const session = { data: { session: { access_token: 'tok' } }, error: null };
const never = () => new Promise<never>(() => undefined);
const sentInit = (): RequestInit => (mockFetch.mock.calls.at(-1) as [string, RequestInit])[1];

beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
  jest.mocked(connectivity.reportFailure).mockClear();
  getSession.mockReset();
  getSession.mockResolvedValue(session as never);
});
afterEach(() => jest.useRealTimers());

test('call reads with the token and parses with the schema', async () => {
  mockFetch.mockResolvedValue(new Response('{"role":"admin","x":1}', { status: 200 }));
  const me = await call({ path: '/auth/me', schema: z.object({ role: z.string() }) });
  expect(me).toEqual({ role: 'admin' });
  expect(new Headers(sentInit().headers).get('Authorization')).toBe('Bearer tok');
});

test('a read through call ends at the read deadline and tells the connection state', async () => {
  jest.useFakeTimers();
  mockFetch.mockImplementation(never);
  const settled = expect(call({ path: '/threads/x' })).rejects.toBeInstanceOf(TypeError);
  await jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
  await settled;
  expect(connectivity.reportFailure).toHaveBeenCalledTimes(1);
  expect(sentInit().signal?.aborted).toBe(true);
});

test('a write through call waits past the read deadline and stalls at the send one', async () => {
  jest.useFakeTimers();
  mockFetch.mockImplementation(never);
  const onDone = jest.fn();
  const send = call({ method: 'POST', path: '/threads/x/text', body: { text: 'hi' } });
  void send.then(onDone, onDone);
  await jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
  expect(onDone).not.toHaveBeenCalled();
  const settled = expect(send).rejects.toBeInstanceOf(TypeError);
  await jest.advanceTimersByTimeAsync(SEND_TIMEOUT_MS - READ_TIMEOUT_MS);
  await settled;
  expect(connectivity.reportFailure).toHaveBeenCalledTimes(1);
});
