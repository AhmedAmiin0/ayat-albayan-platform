import { defineRoute } from '@ab/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiErrorCode, call, parseResponse, type ApiClient } from '../../../..';

const link = z.object({ code: z.string(), title: z.string() });
const routes = {
  list: defineRoute({
    method: 'GET',
    path: '/links',
    query: z.object({ page: z.coerce.number().default(1), search: z.string().optional() }),
    response: z.object({ rows: z.array(link), total: z.number() }),
  }),
  update: defineRoute({
    method: 'PATCH',
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
  return { api, apiFetch, apiSend };
}

describe('call', () => {
  it('reads a GET route with its query string and parses the answer', async () => {
    const { api, apiFetch } = fakeApi({ rows: [{ code: 'a', title: 'x', extra: 1 }], total: 1 });
    const page = await call(api, routes.list, { query: { search: 'نور', page: 2 } });
    expect(page).toEqual({ rows: [{ code: 'a', title: 'x' }], total: 1 });
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/links?search=%D9%86%D9%88%D8%B1&page=2');
  });

  it('leaves empty query values out', async () => {
    const { api, apiFetch } = fakeApi({ rows: [], total: 0 });
    await call(api, routes.list, { query: { search: '' } });
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/links');
  });

  it('sends a write with its filled path and body', async () => {
    const { api, apiSend } = fakeApi({ code: 'a/b', title: 'new' });
    await expect(
      call(api, routes.update, { params: { code: 'a/b' }, body: { title: 'new' } }),
    ).resolves.toEqual({ code: 'a/b', title: 'new' });
    const [method, path, opts] = apiSend.mock.calls[0] ?? [];
    expect([method, path]).toEqual(['PATCH', '/links/a%2Fb']);
    expect(opts).toMatchObject({ body: { title: 'new' } });
  });

  it('resolves undefined for an empty answer', async () => {
    const { api } = fakeApi(undefined);
    await expect(call(api, routes.remove, { params: { code: 'a' } })).resolves.toBeUndefined();
  });

  it('turns a body for an empty answer into bad_response', async () => {
    const { api } = fakeApi({ unexpected: true });
    const error: unknown = await call(api, routes.remove, { params: { code: 'a' } }).catch(
      (e: unknown) => e,
    );
    expect(apiErrorCode(error)).toBe('bad_response');
  });
});
