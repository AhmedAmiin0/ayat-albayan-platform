import { describe, expect, it, vi } from 'vitest';
import { createDb } from './db-client';
import { isDbTimeout } from './db-timeout';

const never = vi.fn((_url: string | URL | Request, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  }),
);

describe('the DB client (supabase-js with the deadline)', () => {
  it('a stalled read returns a DbTimeoutError result once, not retried, not hung', async () => {
    const db = createDb({ url: 'http://db.test', key: 'k', timeoutMs: 20, base: never });
    const { data, error } = await db.from('roles').select('id').limit(1);
    expect(data).toBeNull();
    expect(isDbTimeout(error)).toBe(true);
    expect(never).toHaveBeenCalledTimes(1);
  });

  it('a stalled RPC (a write) fails the same way', async () => {
    const db = createDb({ url: 'http://db.test', key: 'k', timeoutMs: 20, base: never });
    const { error } = await db.rpc('touch_last_seen' as never);
    expect(isDbTimeout(error)).toBe(true);
  });

  it('a fast answer is the data', async () => {
    const fast = vi.fn(async () => new Response('[{"id":"r1"}]', { status: 200, headers: { 'content-type': 'application/json' } }));
    const db = createDb({ url: 'http://db.test', key: 'k', timeoutMs: 1_000, base: fast });
    const { data, error } = await db.from('roles').select('id');
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 'r1' }]);
  });
});
