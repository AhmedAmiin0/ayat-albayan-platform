import { pageOf } from '@ab/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { infinitePageOptions, pageOptions, parseResponse, type ApiClient } from '../../..';

const leads = { path: '/leads', page: pageOf(z.object({ id: z.string() })) };
const body = { items: [{ id: 'a', extra: 1 }], total: 3, page: 1, pageSize: 1 };

function fakeApi() {
  const apiFetch = vi.fn(async (path: string, init?: RequestInit & { schema?: z.ZodType }) =>
    init?.schema ? parseResponse(init.schema, body, path) : body,
  );
  const api: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { api, apiFetch };
}

describe('pageOptions', () => {
  it('keys the list by path and params and parses one page', async () => {
    const { api, apiFetch } = fakeApi();
    const options = pageOptions(api, leads, { status: 'new', q: '', page: 2 });
    expect(options.queryKey).toEqual(['leads', 'list', { status: 'new', q: '', page: 2 }]);
    await expect(options.queryFn()).resolves.toEqual({ ...body, items: [{ id: 'a' }] });
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/leads?status=new&page=2');
  });
});

describe('infinitePageOptions', () => {
  it('starts at page 1, asks each page and stops after the last row', async () => {
    const { api, apiFetch } = fakeApi();
    const options = infinitePageOptions(api, leads, { status: 'new' });
    expect(options.initialPageParam).toBe(1);
    expect(options.queryKey).toEqual(['leads', 'list', { status: 'new' }]);
    const first = await options.queryFn({ pageParam: 3 });
    expect(apiFetch.mock.calls[0]?.[0]).toBe('/leads?status=new&page=3');
    expect(options.getNextPageParam(first)).toBe(2);
    expect(options.getNextPageParam({ ...first, page: 3 })).toBeUndefined();
  });
});
