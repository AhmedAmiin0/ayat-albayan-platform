import { defineRoute, routePath } from '@ab/core';
import { READ_TIMEOUT_MS, SEND_TIMEOUT_MS } from '@ab/client-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { call, publicCall } from '@ab/web-kit/lib/http/api';

const routes = {
  student: defineRoute({ method: 'GET', path: '/students/s1', response: z.unknown() }),
  threads: defineRoute({ method: 'GET', path: '/threads', response: z.unknown() }),
  messageFile: defineRoute({
    method: 'GET',
    path: '/threads/%2B9665/messages/m1/file',
    response: z.unknown(),
  }),
  threadText: defineRoute({ method: 'POST', path: '/threads/x/text', response: z.unknown() }),
  publicX: defineRoute({ method: 'PUT', path: '/public/x', response: z.unknown() }),
};

vi.mock('@ab/web-kit/lib/http/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  },
}));

const fetchMock = vi.fn<typeof fetch>();
const never = () => new Promise<Response>(() => undefined);
const sent = (): RequestInit => fetchMock.mock.calls.at(-1)?.[1] ?? {};

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('the kit call', () => {
  it('reads with the session token and parses with the schema', async () => {
    fetchMock.mockResolvedValue(new Response('{"id":"s1","x":1}', { status: 200 }));
    const answer = await call({
      path: routePath(routes.student),
      schema: z.object({ id: z.string() }),
    });
    expect(answer).toEqual({ id: 's1' });
    expect(new Headers(sent().headers).get('Authorization')).toBe('Bearer tok');
  });

  it('ends a read with no answer at the read deadline and aborts its fetch', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(never);
    const settled = expect(call({ path: routePath(routes.threads) })).rejects.toBeInstanceOf(
      TypeError,
    );
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
    await settled;
    expect(sent().signal?.aborted).toBe(true);
  });

  it('gives a chat file the slow read deadline', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(never);
    const onDone = vi.fn();
    void call({ path: routePath(routes.messageFile) }).then(onDone, onDone);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS * 3);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('lets a write wait past the read deadline, then ends it at the send deadline', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(never);
    const onDone = vi.fn();
    const send = call({ method: 'POST', path: routePath(routes.threadText), body: { text: 'hi' } });
    void send.then(onDone, onDone);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
    expect(onDone).not.toHaveBeenCalled();
    const settled = expect(send).rejects.toBeInstanceOf(TypeError);
    await vi.advanceTimersByTimeAsync(SEND_TIMEOUT_MS - READ_TIMEOUT_MS);
    await settled;
  });
});

describe('publicCall', () => {
  it('never sends the session token', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(
      publicCall({ method: 'PUT', path: routePath(routes.publicX), body: {} }),
    ).resolves.toBe(undefined);
    expect(new Headers(sent().headers).get('Authorization')).toBeNull();
    expect(new Headers(sent().headers).get('X-AB-Client')).toBe('web/dev');
  });
});
