import { defineRoute } from '@ab/core';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, cookieCall } from '@ab/web-kit/lib/http/api/api';

// The report page's code gate: no session token, and the browser keeps and sends the cookie.

vi.mock('@ab/web-kit/lib/http/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  },
}));

const fetchMock = vi.fn<typeof fetch>();
const lastInit = (): RequestInit => fetchMock.mock.calls.at(-1)?.[1] ?? {};
const read = defineRoute({
  method: 'GET',
  path: '/public/x/:id',
  params: z.object({ id: z.string() }),
  response: z.object({ ok: z.boolean() }),
});
const send = defineRoute({
  method: 'POST',
  path: '/public/x',
  body: z.object({}),
  response: 'empty',
});

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

it('a read sends the cookie and no session token, and parses the answer', async () => {
  fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
  await expect(cookieCall({ route: read, params: { id: 'a' } })).resolves.toEqual({ ok: true });
  expect(lastInit().credentials).toBe('include');
  expect(new Headers(lastInit().headers).get('Authorization')).toBeNull();
});

it('a send keeps the cookie the answer sets', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  await expect(cookieCall({ route: send, body: {} })).resolves.toBeUndefined();
  expect(lastInit().credentials).toBe('include');
});

it('a refusal is an ApiError with its JSON body', async () => {
  fetchMock.mockResolvedValue(new Response('{"code":"code_required"}', { status: 401 }));
  const err = await cookieCall({ route: read, params: { id: 'a' } }).catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err).toMatchObject({ status: 401, body: { code: 'code_required' } });
});
