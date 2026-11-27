import { defineRoute } from '@ab/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { callWith, type ApiClient } from '../../../..';

const link = z.object({ code: z.string() });
const create = defineRoute({ method: 'POST', path: '/links', body: link, response: link });
const read = defineRoute({ method: 'GET', path: '/links/:code', params: link, response: link });

function pairApi(answer: unknown) {
  const apiFetch = vi.fn(async (_path: string, _init?: RequestInit): Promise<unknown> => answer);
  const apiSend = vi.fn(async (..._args: unknown[]): Promise<unknown> => answer);
  const api: ApiClient = { apiFetch, apiSend };
  return { call: callWith(api), apiFetch, apiSend };
}

describe('callWith over a client that has only the pair', () => {
  it('reads through apiFetch with the caller signal and headers', async () => {
    const { call, apiFetch, apiSend } = pairApi({ code: 'a' });
    const abort = new AbortController();
    const headers = { Accept: 'application/json' };
    await call({ path: '/links/a', signal: abort.signal, headers });
    expect(apiFetch.mock.calls[0]).toEqual(['/links/a', { signal: abort.signal, headers }]);
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('reads a route through apiFetch with the caller signal, so a dropped read stops', async () => {
    const { call, apiFetch } = pairApi({ code: 'a' });
    const abort = new AbortController();
    await call({ route: read, params: { code: 'a' }, signal: abort.signal });
    expect(apiFetch.mock.calls[0]).toEqual(['/links/a', { signal: abort.signal }]);
  });

  it('reads a route with no signal as a plain apiFetch', async () => {
    const { call, apiFetch } = pairApi({ code: 'a' });
    await call({ route: read, params: { code: 'a' } });
    expect(apiFetch.mock.calls[0]).toEqual(['/links/a']);
  });

  it('sends a route write through apiSend as a hand-written call did', async () => {
    const { call, apiSend, apiFetch } = pairApi({ code: 'n' });
    await expect(call({ route: create, body: { code: 'n' } })).resolves.toEqual({ code: 'n' });
    expect(apiSend.mock.calls[0]).toEqual(['POST', '/links', { code: 'n' }]);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('sends a path write with no body as a call with no body', async () => {
    const { call, apiSend } = pairApi(undefined);
    await call({ method: 'DELETE', path: '/links/a' });
    expect(apiSend.mock.calls[0]).toEqual(['DELETE', '/links/a', undefined]);
  });
});
