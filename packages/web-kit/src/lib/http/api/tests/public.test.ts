import { READ_TIMEOUT_MS, SEND_TIMEOUT_MS } from '@ab/client-core';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApiError, publicCall } from '@ab/web-kit/lib/http/api/api';

// Every signed-link page (guest join, student link, feedback, meeting) uses this client.

vi.mock('@ab/web-kit/lib/http/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  },
}));

const fetchMock = vi.fn<typeof fetch>();
const never = () => new Promise<Response>(() => undefined);
const lastInit = (): RequestInit => fetchMock.mock.calls.at(-1)?.[1] ?? {};

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

it('a public read sends no session token while staff are signed in', async () => {
  fetchMock.mockResolvedValue(new Response('{"kind":"trial"}', { status: 200 }));
  await expect(publicCall({ path: '/public/feedback/t' })).resolves.toEqual({ kind: 'trial' });
  expect(new Headers(lastInit().headers).get('Authorization')).toBeNull();
});

it('a public refusal is an ApiError with its JSON body, as the pages read it', async () => {
  fetchMock.mockResolvedValue(new Response('{"code":"link_expired"}', { status: 410 }));
  const err = await publicCall({
    method: 'POST',
    path: '/public/join/t',
    body: { name: 'x' },
  }).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status: 410, body: { code: 'link_expired' } });
  expect(lastInit().body).toBe('{"name":"x"}');
});

it('an empty refusal body is null', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 502 }));
  const err = await publicCall({ path: '/public/student/t' }).catch((e: unknown) => e);
  expect(err).toMatchObject({ status: 502, body: null });
});

it('a public join with no answer ends as no answer at 30 s and aborts its fetch', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementation(never);
  const join = publicCall({ method: 'POST', path: '/public/meetings/t/join', body: { name: 'x' } });
  const settled = expect(join).rejects.toBeInstanceOf(TypeError);
  await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS);
  await settled;
  expect(lastInit().signal?.aborted).toBe(true);
});

it('a public read keeps waiting past the read deadline, as before', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementation(never);
  const onDone = vi.fn();
  void publicCall({ path: '/public/meetings/t' }).then(onDone, onDone);
  await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS * 2);
  expect(onDone).not.toHaveBeenCalled();
});
