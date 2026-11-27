import { defineRoute } from '@ab/core';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { callWith, type ApiClient } from '../../../..';

const link = z.object({ code: z.string() });
const read = defineRoute({ method: 'GET', path: '/links', response: link });

function pairApi() {
  const apiFetch = vi.fn(async (_path: string, _init?: RequestInit): Promise<unknown> => ({
    code: 'a',
  }));
  const api: ApiClient = { apiFetch, apiSend: vi.fn() };
  return { call: callWith(api), apiFetch };
}

describe('a route read with the caller signal', () => {
  it('hands the signal to the read, so a dropped query drops its request', async () => {
    const { call, apiFetch } = pairApi();
    const abort = new AbortController();
    await expect(call({ route: read, signal: abort.signal })).resolves.toEqual({ code: 'a' });
    expect(apiFetch.mock.calls[0]).toEqual(['/links', { signal: abort.signal }]);
  });

  it('reads with no init when no signal is given', async () => {
    const { call, apiFetch } = pairApi();
    await call({ route: read });
    expect(apiFetch.mock.calls[0]).toEqual(['/links']);
  });

  it('hands the signal to a client that has its one request', async () => {
    const request = vi.fn(async (): Promise<unknown> => ({ code: 'b' }));
    const abort = new AbortController();
    await callWith({ request })({ route: read, signal: abort.signal });
    expect(request.mock.calls[0]).toEqual([
      { method: 'GET', path: '/links', body: undefined, signal: abort.signal },
    ]);
  });
});
