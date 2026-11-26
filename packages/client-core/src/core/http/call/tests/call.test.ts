import { defineRoute } from '@ab/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiErrorCode, callWith, parseResponse, type ApiClient } from '../../../..';

const link = z.object({ code: z.string(), title: z.string() });
const routes = {
  list: defineRoute({
    method: 'GET',
    path: '/links',
    query: z.object({ page: z.coerce.number().default(1), search: z.string().optional() }),
    response: z.object({ rows: z.array(link), total: z.number() }),
  }),
  flags: defineRoute({
    method: 'GET',
    path: '/flags',
    query: z.object({ active: z.boolean().optional(), note: z.string().nullable().optional() }),
    response: z.object({}),
  }),
  create: defineRoute({
    method: 'POST',
    path: '/links',
    body: z.object({ title: z.string() }),
    response: link,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/links/:code',
    params: z.object({ code: z.string() }),
    body: z.object({ title: z.string() }),
    response: link,
  }),
  replace: defineRoute({
    method: 'PUT',
    path: '/links/:code',
    params: z.object({ code: z.string() }),
    body: z.object({ title: z.string() }),
    response: link,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/links/:code',
    params: z.object({ code: z.string() }),
    response: 'empty',
  }),
};

function fakeApi(answer: unknown) {
  const parsed = (path: string, schema?: z.ZodType) =>
    schema ? parseResponse(schema, answer, path) : answer;
  const apiFetch = vi.fn(async (path: string, init?: RequestInit & { schema?: z.ZodType }) =>
    parsed(path, init?.schema),
  );
  const apiSend = vi.fn(async (_m: string, path: string, opts?: { schema?: z.ZodType }) =>
    parsed(path, opts?.schema),
  );
  const api: ApiClient = { apiFetch, apiSend };
  return { call: callWith(api), apiFetch, apiSend };
}

describe('callWith', () => {
  it('reads a GET route with its query string and parses the answer', async () => {
    const { call, apiFetch } = fakeApi({ rows: [{ code: 'a', title: 'x', extra: 1 }], total: 1 });
    const page = await call({ route: routes.list, query: { search: 'نور', page: 2 } });
    expect(page).toEqual({ rows: [{ code: 'a', title: 'x' }], total: 1 });
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/links?search=%D9%86%D9%88%D8%B1&page=2');
  });

  it('reads with the plain call a hand-written client made, and parses the answer itself', async () => {
    const { call, apiFetch } = fakeApi({ rows: [], total: 0 });
    await call({ route: routes.list, query: {} });
    expect(apiFetch.mock.calls[0]).toEqual(['/links']);
  });

  it('leaves empty query values out', async () => {
    const { call, apiFetch } = fakeApi({ rows: [], total: 0 });
    await call({ route: routes.list, query: { search: '' } });
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/links');
  });

  it('drops a null query value and sends a boolean as text', async () => {
    const { call, apiFetch } = fakeApi({});
    await call({ route: routes.flags, query: { active: true, note: null } });
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/flags?active=true');
  });

  it('sends a write through apiSend with its own method, never through apiFetch', async () => {
    const { call, apiFetch, apiSend } = fakeApi({ code: 'n', title: 'new' });
    await expect(call({ route: routes.create, body: { title: 'new' } })).resolves.toEqual({
      code: 'n',
      title: 'new',
    });
    expect(apiSend.mock.calls[0]).toEqual(['POST', '/links', { title: 'new' }]);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('sends a write with its filled path and body', async () => {
    const { call, apiSend } = fakeApi({ code: 'a/b', title: 'new' });
    await expect(
      call({ route: routes.update, params: { code: 'a/b' }, body: { title: 'new' } }),
    ).resolves.toEqual({ code: 'a/b', title: 'new' });
    expect(apiSend.mock.calls[0]).toEqual(['PATCH', '/links/a%2Fb', { title: 'new' }]);
  });

  it('sends PUT with its own method', async () => {
    const { call, apiSend } = fakeApi({ code: 'a', title: 'x' });
    await call({ route: routes.replace, params: { code: 'a' }, body: { title: 'x' } });
    expect(apiSend.mock.calls[0]).toEqual(['PUT', '/links/a', { title: 'x' }]);
  });

  it('resolves undefined for an empty answer, sent as DELETE', async () => {
    const { call, apiSend } = fakeApi(undefined);
    await expect(call({ route: routes.remove, params: { code: 'a' } })).resolves.toBeUndefined();
    expect(apiSend.mock.calls[0]).toEqual(['DELETE', '/links/a', undefined]);
  });

  it('turns a body for an empty answer into bad_response', async () => {
    const { call } = fakeApi({ unexpected: true });
    const error: unknown = await call({ route: routes.remove, params: { code: 'a' } }).catch(
      (e: unknown) => e,
    );
    expect(apiErrorCode(error)).toBe('bad_response');
  });
});
