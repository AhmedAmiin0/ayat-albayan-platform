import { describe, expect, it, vi } from 'vitest';
import { DbTimeoutError } from '@/common/db/db-timeout';
import { timedFetch } from './db-fetch';

const BASE = 'http://db.test';
const ok = () => new Response('[]', { status: 200 });

/** A fetch that answers after `ms`, or rejects with the signal's reason when aborted first. */
function slowFetch(ms: number) {
  return vi.fn((_url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => resolve(ok()), ms);
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('This operation was aborted', 'AbortError'));
      });
    }),
  );
}

describe('timedFetch (every database call gets a deadline)', () => {
  it('a fast database call passes untouched', async () => {
    const base = slowFetch(1);
    const res = await timedFetch({ ms: 200, base })(`${BASE}/rest/v1/roles?select=id`);
    expect(res.status).toBe(200);
  });

  it('a stalled database call fails fast with the typed error', async () => {
    const base = slowFetch(10_000);
    const started = Date.now();
    const call = timedFetch({ ms: 20, base })(`${BASE}/rest/v1/rpc/slow`, { method: 'POST' });
    await expect(call).rejects.toBeInstanceOf(DbTimeoutError);
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it('auth calls get the deadline too; storage transfers (big files) never do', async () => {
    const base = slowFetch(10_000);
    const fetch = timedFetch({ ms: 20, base });
    await expect(fetch(`${BASE}/auth/v1/admin/users`)).rejects.toBeInstanceOf(DbTimeoutError);
    const upload = fetch(new URL(`${BASE}/storage/v1/object/reports/a.pdf`));
    const settled = await Promise.race([upload.then(() => 'done'), new Promise((r) => setTimeout(() => r('still going'), 60))]);
    expect(settled).toBe('still going');
  });

  it('a caller’s own abort stays the caller’s (not a timeout)', async () => {
    const base = slowFetch(10_000);
    const own = new AbortController();
    const call = timedFetch({ ms: 5_000, base })(`${BASE}/rest/v1/roles`, { signal: own.signal });
    own.abort();
    await expect(call).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('a network error passes through unchanged', async () => {
    const base = vi.fn(() => Promise.reject(new TypeError('fetch failed')));
    await expect(timedFetch({ ms: 50, base })(`${BASE}/rest/v1/roles`)).rejects.toThrow('fetch failed');
  });
});

