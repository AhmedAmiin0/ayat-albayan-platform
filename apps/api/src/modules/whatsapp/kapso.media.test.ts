import { afterEach, describe, expect, it, vi } from 'vitest';
import { graphFetch } from './graph';
import { fetchMedia, MEDIA_BYTES_TIMEOUT_MS } from './kapso';
import { KAPSO_ENV, KAPSO_MEDIA, kapsoFetch } from './kapso.fakes';
import { STUB_ENV } from './whatsapp.fakes';

// docs/21 §4.5: the media BYTE download gets 60 s on both drivers (a 16 MB video); the JSON lookup
// keeps the connection's timeout.

const CONN_MS = 5_000;

describe('fetchMedia byte timeout (owner 2026-10-19 #1)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is 60 000 ms', () => {
    expect(MEDIA_BYTES_TIMEOUT_MS).toBe(60_000);
  });

  it('meta: the lookup uses the connection timeout, the byte fetch 60 s', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const f = kapsoFetch({ status: 200, body: { url: 'https://lookaside.example.test/m1', mime_type: 'audio/ogg' } }, { bytes: new Uint8Array([1, 2]) });
    const out = await fetchMedia({ env: STUB_ENV, fetch: f.fetch, timeoutMs: CONN_MS }, 'm1');
    expect(out).toEqual({ bytes: new Uint8Array([1, 2]), mime: 'audio/ogg' });
    expect(timeout.mock.calls).toEqual([[CONN_MS], [60_000]]);
    expect(f.requests[1]?.url).toBe('https://lookaside.example.test/m1');
  });

  it('kapso: the same, and the download_url still carries no credential', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const f = kapsoFetch({ status: 200, body: KAPSO_MEDIA }, { bytes: new Uint8Array([3]) });
    await fetchMedia({ env: KAPSO_ENV, fetch: f.fetch, timeoutMs: CONN_MS }, 'm1');
    expect(timeout.mock.calls).toEqual([[CONN_MS], [60_000]]);
    expect(f.requests[1]).toEqual({ url: KAPSO_MEDIA.download_url, headers: {} });
  });

  it('graphFetch without timeoutMs keeps the connection timeout', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const f = kapsoFetch({ status: 200, body: {} });
    await graphFetch({ env: STUB_ENV, fetch: f.fetch, timeoutMs: CONN_MS }, { path: 'x' });
    expect(timeout).toHaveBeenCalledWith(CONN_MS);
  });
});
