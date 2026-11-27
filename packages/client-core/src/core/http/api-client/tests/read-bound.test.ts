import { describe, expect, it, vi } from 'vitest';
import { boundReads, type ApiRequest, type ReadBound, type Requester } from '../../../..';

function setup() {
  const request = vi.fn(async (_sent: ApiRequest): Promise<unknown> => 'answer');
  const client: Requester = { request };
  const own = new AbortController();
  const seen: { init: RequestInit; path: string }[] = [];
  const bound: ReadBound = (send, init, path) => {
    seen.push({ init, path });
    return send({ ...init, signal: own.signal });
  };
  return { bounded: boundReads(client, bound), request, seen, own };
}

describe('boundReads', () => {
  it('hands the bound the method, the caller signal and the path', async () => {
    const { bounded, seen } = setup();
    const caller = new AbortController();
    await bounded.request({ path: '/threads', signal: caller.signal });
    await bounded.request({ method: 'POST', path: '/threads/x/text', body: {} });
    expect(seen).toEqual([
      { init: { method: 'GET', signal: caller.signal }, path: '/threads' },
      { init: { method: 'POST' }, path: '/threads/x/text' },
    ]);
  });

  it('asks the client with the signal the bound gives, keeping the rest', async () => {
    const { bounded, request, own } = setup();
    await expect(bounded.request({ path: '/x', headers: { A: '1' } })).resolves.toBe('answer');
    expect(request.mock.calls[0]?.[0]).toEqual({
      path: '/x',
      headers: { A: '1' },
      signal: own.signal,
    });
  });
});
