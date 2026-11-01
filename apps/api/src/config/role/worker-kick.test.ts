import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kickWorker } from './worker-kick';

// h1 (docs/36): the kick goes through the core and still never throws.
vi.mock('./app-role', () => ({
  appRole: () => 'api',
  peerUrls: () => [],
  workerUrl: () => 'http://worker.invalid:3001',
}));
vi.mock('@/config/env/env', () => ({ loadEnv: () => ({ SUPABASE_SERVICE_ROLE_KEY: 'k' }) }));

let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('kickWorker', () => {
  it('POSTs the kick route with the internal token', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    await kickWorker('sender');
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://worker.invalid:3001/internal/jobs/sender/kick');
    expect(init.method).toBe('POST');
    expect(Object.keys(init.headers ?? {})).toEqual(['x-ab-internal']);
    expect(warn).not.toHaveBeenCalled();
  });

  it('a non-2xx is logged with its status, never thrown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no', { status: 503 })));
    await expect(kickWorker('sender')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('sender: worker kick: answered 503, left for its next poll');
  });

  it('a refused worker is logged, never thrown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(kickWorker('sender')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('sender: worker kick: failed'));
  });
});
