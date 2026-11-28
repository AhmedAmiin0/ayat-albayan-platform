import { defineRoute, routePath } from '@ab/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiErrorCode, callWith, type ApiRequest, type Requester } from '../../../..';

const routes = {
  x: defineRoute({ method: 'GET', path: '/x', response: z.unknown() }),
  lead: defineRoute({ method: 'GET', path: '/leads/l1', response: z.unknown() }),
  x1: defineRoute({ method: 'DELETE', path: '/x/1', response: z.unknown() }),
};

const lead = z.object({ id: z.string() });

function fakeApi(answer: unknown) {
  const request = vi.fn(async (_sent: ApiRequest): Promise<unknown> => answer);
  const api: Requester = { request };
  return { call: callWith(api), request };
}

describe('call, path form', () => {
  it('reads with GET by default and hands signal and headers to the client', async () => {
    const { call, request } = fakeApi({ id: 'l1' });
    const abort = new AbortController();
    const headers = { Accept: 'application/json' };
    await call({ path: routePath(routes.lead), signal: abort.signal, headers });
    expect(request.mock.calls[0]?.[0]).toEqual({
      path: '/leads/l1',
      signal: abort.signal,
      headers,
    });
  });

  it('parses the answer with the schema, without keys it does not declare', async () => {
    const { call } = fakeApi({ id: 'l1', phone: 'x' });
    const answer: { id: string } = await call({ path: routePath(routes.lead), schema: lead });
    expect(answer).toEqual({ id: 'l1' });
  });

  it('turns an answer that breaks the schema into bad_response', async () => {
    const { call } = fakeApi({ id: 1 });
    const error = await call({ path: routePath(routes.lead), schema: lead }).catch(
      (e: unknown) => e,
    );
    expect(apiErrorCode(error)).toBe('bad_response');
  });

  it('returns the answer as it came without a schema, typed by the caller', async () => {
    const { call } = fakeApi({ any: 'thing' });
    await expect(call<{ any: string }>({ path: routePath(routes.x) })).resolves.toEqual({
      any: 'thing',
    });
  });

  it('sends a write with its method and body', async () => {
    const { call, request } = fakeApi(undefined);
    const remove = (): Promise<void> => call({ method: 'DELETE', path: routePath(routes.x1) });
    await expect(remove()).resolves.toBeUndefined();
    await expect(
      call({ method: 'DELETE', path: routePath(routes.x1), body: { why: 'dup' } }),
    ).resolves.toBe(undefined);
    expect(request.mock.calls[1]?.[0]).toEqual({
      method: 'DELETE',
      path: '/x/1',
      body: { why: 'dup' },
    });
  });
});
