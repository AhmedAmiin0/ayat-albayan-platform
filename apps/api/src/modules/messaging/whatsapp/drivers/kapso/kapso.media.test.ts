import { PLAYABLE_MAX_BYTES } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { graphHttp } from '@/modules/messaging/whatsapp/drivers/meta/graph';
import { fetchMedia, MEDIA_BYTES_TIMEOUT_MS } from './kapso';
import { KAPSO_ENV, KAPSO_MEDIA, kapsoFetch } from './kapso.fakes';
import { STUB_ENV } from '@/modules/messaging/whatsapp/whatsapp.fakes';

// docs/21 §4.5: the media BYTE download gets 60 s on both drivers (a 16 MB video); the JSON lookup
// keeps the connection's timeout. docs/36 h8: the bytes are cut while streaming at the mime's cap.

const CONN_MS = 5_000;

/** The scripted lookup, then a byte download that never answers (it ends only by its deadline). */
function hangingBytes(lookup: unknown) {
  const f = kapsoFetch({ status: 200, body: lookup });
  const fetch = (url: string, init: RequestInit): Promise<Response> =>
    f.requests.length === 0 ? f.fetch(url, init) : new Promise<Response>(() => undefined);
  return fetch;
}

/** Settles `p` after `ms` of fake time; 'pending' when it has not settled by then. */
async function after(ms: number, p: Promise<unknown>): Promise<unknown> {
  const seen = p.then(
    (v) => ({ v }),
    (e: unknown) => ({ e }),
  );
  await vi.advanceTimersByTimeAsync(ms);
  return Promise.race([seen, Promise.resolve('pending')]);
}

describe('fetchMedia byte timeout (owner 2026-10-19 #1)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is 60 000 ms', () => {
    expect(MEDIA_BYTES_TIMEOUT_MS).toBe(60_000);
  });

  it('meta: the lookup, then the bytes from its url', async () => {
    const lookup = { url: 'https://lookaside.example.test/m1', mime_type: 'audio/ogg' };
    const f = kapsoFetch({ status: 200, body: lookup }, { bytes: new Uint8Array([1, 2]) });
    const out = await fetchMedia({ env: STUB_ENV, fetch: f.fetch, timeoutMs: CONN_MS }, 'm1');
    expect(out).toEqual({ bytes: new Uint8Array([1, 2]), mime: 'audio/ogg' });
    expect(f.requests[1]?.url).toBe('https://lookaside.example.test/m1');
  });

  it('kapso: the download_url still carries no credential', async () => {
    const f = kapsoFetch({ status: 200, body: KAPSO_MEDIA }, { bytes: new Uint8Array([3]) });
    await fetchMedia({ env: KAPSO_ENV, fetch: f.fetch, timeoutMs: CONN_MS }, 'm1');
    expect(f.requests[1]).toEqual({ url: KAPSO_MEDIA.download_url, headers: {} });
  });

  it('the byte fetch ends at 60 s, not at the connection timeout, on both drivers', async () => {
    const lookups = [
      { env: STUB_ENV, body: { url: 'https://lookaside.example.test/m1', mime_type: 'image/jpeg' } },
      { env: KAPSO_ENV, body: KAPSO_MEDIA },
    ];
    for (const { env, body } of lookups) {
      vi.useFakeTimers();
      const media = fetchMedia({ env, fetch: hangingBytes(body), timeoutMs: CONN_MS }, 'm1');
      expect(await after(MEDIA_BYTES_TIMEOUT_MS - 1, media)).toBe('pending');
      const ended = await after(1, media);
      expect(ended).toMatchObject({ e: expect.any(WaError) });
      expect((ended as { e: WaError }).e.info).toMatchObject({ status: 0, uncertain: true });
      vi.useRealTimers();
    }
  });

  it('the media lookup keeps the connection timeout', async () => {
    vi.useFakeTimers();
    const hang = (): Promise<Response> => new Promise<Response>(() => undefined);
    const media = fetchMedia({ env: STUB_ENV, fetch: hang, timeoutMs: CONN_MS }, 'm1');
    expect(await after(CONN_MS - 1, media)).toBe('pending');
    expect(await after(1, media)).toMatchObject({ e: expect.any(WaError) });
  });

  it('a JSON call without its own timeout keeps the connection timeout', async () => {
    vi.useFakeTimers();
    const hang = (): Promise<Response> => new Promise<Response>(() => undefined);
    const http = graphHttp({ env: STUB_ENV, fetch: hang, timeoutMs: CONN_MS });
    const call = http.json({ path: 'x', schema: z.unknown() });
    expect(await after(CONN_MS - 1, call)).toBe('pending');
    expect(await after(1, call)).toMatchObject({ e: expect.any(WaError) });
  });

  it('bytes over the mime cap → 413 invoice_too_large, cut while streaming', async () => {
    const lookup = { url: 'https://lookaside.example.test/m1', mime_type: 'video/mp4' };
    const big = new Uint8Array(PLAYABLE_MAX_BYTES + 1);
    const f = kapsoFetch({ status: 200, body: lookup }, { bytes: big });
    const e = await fetchMedia({ env: STUB_ENV, fetch: f.fetch, timeoutMs: CONN_MS }, 'm1').catch(
      (x: unknown) => x,
    );
    expect(e).toMatchObject({ status: 413, response: { code: 'invoice_too_large' } });
  });
});
