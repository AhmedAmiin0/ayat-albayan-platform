import { defineRoute } from '@ab/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  apiErrorCode,
  callWith,
  parseResponse,
  type ApiRequest,
  type Requester,
} from '../../../..';

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
  const request = vi.fn(async (sent: ApiRequest) =>
    sent.schema ? parseResponse(sent.schema, answer, sent.path) : answer,
  );
  const api: Requester = { request };
  return { call: callWith(api), request };
}

describe('callWith', () => {
  it('reads a GET route with its query string and parses the answer', async () => {
    const { call, request } = fakeApi({ rows: [{ code: 'a', title: 'x', extra: 1 }], total: 1 });
    const page = await call({ route: routes.list, query: { search: 'نور', page: 2 } });
    expect(page).toEqual({ rows: [{ code: 'a', title: 'x' }], total: 1 });
    expect(request.mock.calls[0]?.[0].path).toBe('/links?search=%D9%86%D9%88%D8%B1&page=2');
  });

  it('asks the client for a GET with no schema, and parses the answer itself', async () => {
    const { call, request } = fakeApi({ rows: [], total: 0 });
    await call({ route: routes.list, query: {} });
    expect(request.mock.calls[0]).toEqual([{ method: 'GET', path: '/links' }]);
  });

  it('leaves empty query values out', async () => {
    const { call, request } = fakeApi({ rows: [], total: 0 });
    await call({ route: routes.list, query: { search: '' } });
    expect(request.mock.calls[0]?.[0].path).toBe('/links');
  });

  it('drops a null query value and sends a boolean as text', async () => {
    const { call, request } = fakeApi({});
    await call({ route: routes.flags, query: { active: true, note: null } });
    expect(request.mock.calls[0]?.[0].path).toBe('/flags?active=true');
  });

  it('sends a write with its own method and body', async () => {
    const { call, request } = fakeApi({ code: 'n', title: 'new' });
    await expect(call({ route: routes.create, body: { title: 'new' } })).resolves.toEqual({
      code: 'n',
      title: 'new',
    });
    expect(request.mock.calls[0]).toEqual([
      { method: 'POST', path: '/links', body: { title: 'new' } },
    ]);
  });

  it('sends a write with its filled path and body', async () => {
    const { call, request } = fakeApi({ code: 'a/b', title: 'new' });
    await expect(
      call({ route: routes.update, params: { code: 'a/b' }, body: { title: 'new' } }),
    ).resolves.toEqual({ code: 'a/b', title: 'new' });
    expect(request.mock.calls[0]?.[0]).toEqual({
      method: 'PATCH',
      path: '/links/a%2Fb',
      body: { title: 'new' },
    });
  });

  it('sends PUT with its own method', async () => {
    const { call, request } = fakeApi({ code: 'a', title: 'x' });
    await call({ route: routes.replace, params: { code: 'a' }, body: { title: 'x' } });
    expect(request.mock.calls[0]?.[0]).toEqual({
      method: 'PUT',
      path: '/links/a',
      body: { title: 'x' },
    });
  });

  it('resolves undefined for an empty answer, sent as DELETE', async () => {
    const { call, request } = fakeApi(undefined);
    await expect(call({ route: routes.remove, params: { code: 'a' } })).resolves.toBeUndefined();
    expect(request.mock.calls[0]?.[0]).toEqual({ method: 'DELETE', path: '/links/a' });
  });

  it('turns a body for an empty answer into bad_response', async () => {
    const { call } = fakeApi({ unexpected: true });
    const error: unknown = await call({ route: routes.remove, params: { code: 'a' } }).catch(
      (e: unknown) => e,
    );
    expect(apiErrorCode(error)).toBe('bad_response');
  });
});
