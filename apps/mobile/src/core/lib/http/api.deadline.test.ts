import { connectivity } from '@/core/lib/connectivity/connectivity';
import { apiFetch, apiSend } from './api';
import { READ_TIMEOUT_MS } from './read-deadline';
import { supabase } from './supabase';

// The read deadline covers the whole apiFetch, token included (owner 2026-11-05: a chat read stuck
// across a background pinned the chats list). jest.setup.cjs mocks Supabase and connectivity.
jest.mock('./env', () => ({ env: { apiUrl: 'http://api' } }));

const getSession = jest.mocked(supabase.auth.getSession);
const mockFetch = jest.fn();
const session = { data: { session: { access_token: 'tok' } }, error: null };
const never = () => new Promise<never>(() => undefined);

beforeEach(() => {
  jest.useFakeTimers();
  mockFetch.mockReset();
  globalThis.fetch = mockFetch;
  jest.mocked(connectivity.reportFailure).mockClear();
  getSession.mockReset();
});
afterEach(() => jest.useRealTimers());

async function expectNoAnswerAtDeadline(read: Promise<unknown>) {
  const settled = expect(read).rejects.toEqual(new TypeError('Network request failed'));
  await jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
  await settled;
  expect(connectivity.reportFailure).toHaveBeenCalledTimes(1);
}

test('getSession() that never resolves: the GET rejects at the deadline, nothing is sent', async () => {
  getSession.mockImplementation(never);
  await expectNoAnswerAtDeadline(apiFetch('/threads'));
  expect(mockFetch).not.toHaveBeenCalled();
});

test('a sent GET with no answer rejects at the deadline and its fetch is aborted', async () => {
  getSession.mockResolvedValue(session as never);
  mockFetch.mockImplementation(never);
  await expectNoAnswerAtDeadline(apiFetch('/threads/x'));
  const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  expect(init.signal?.aborted).toBe(true);
});

test('a write (POST) gets no read deadline: still waiting long after it', async () => {
  getSession.mockResolvedValue(session as never);
  mockFetch.mockImplementation(never);
  const onDone = jest.fn();
  void apiSend('POST', '/threads/x/text', { text: 'hi' }).then(onDone, onDone);
  await jest.advanceTimersByTimeAsync(READ_TIMEOUT_MS * 3);
  expect(onDone).not.toHaveBeenCalled();
  expect(connectivity.reportFailure).not.toHaveBeenCalled();
});

test('a failed token refresh is no answer, not an unauthenticated request', async () => {
  getSession.mockResolvedValue({ data: { session: null }, error: new Error('fetch failed') } as never);
  await expect(apiFetch('/threads')).rejects.toBeInstanceOf(TypeError);
  expect(mockFetch).not.toHaveBeenCalled();
});

test("signed out (no session, no error) still sends, without a token", async () => {
  getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockFetch.mockResolvedValue(new Response('{}', { status: 200 }));
  await apiFetch('/public');
  const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  expect(new Headers(init.headers).get('Authorization')).toBeNull();
});

test("the caller's signal (TanStack's) aborts the fetch", async () => {
  getSession.mockResolvedValue(session as never);
  mockFetch.mockImplementation(never);
  const caller = new AbortController();
  const read = apiFetch('/threads', { signal: caller.signal });
  await jest.advanceTimersByTimeAsync(0);
  caller.abort();
  await expect(read).rejects.toMatchObject({ name: 'AbortError' });
  const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
  expect(init.signal?.aborted).toBe(true);
  expect(connectivity.reportFailure).not.toHaveBeenCalled();
});
