import { defineRoute, routePath } from '@ab/core';
import { READ_TIMEOUT_MS } from '@ab/client-core';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { call } from '@ab/web-kit/lib/http/api/api';
import { z } from 'zod';

const routes = {
  sessionStart: defineRoute({
    method: 'POST',
    path: '/activity/session/start',
    response: z.unknown(),
  }),
};

vi.mock('@ab/web-kit/lib/http/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  },
}));

const fetchMock = vi.fn<typeof fetch>();
const never = () => new Promise<Response>(() => undefined);

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(never);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

it('a POST through apiFetch is not cut at the read deadline and keeps its method', async () => {
  const onDone = vi.fn();
  void call({ path: routePath(routes.sessionStart), method: 'POST' }).then(onDone, onDone);
  await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS * 1.2);
  expect(onDone).not.toHaveBeenCalled();
  expect(fetchMock.mock.calls.at(-1)?.[1]?.method).toBe('POST');
});
