import { HttpException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CRM_FETCH_TIMEOUT_MS, fetchCrmMedia, sameFamily } from './crm-media.fetch';
import { crmLink, crmResponse, stubFetch } from './crm-history.fakes';

const url = new URL(crmLink());
const input = { url, mime: 'image/webp', maxBytes: 100 };
const status = async (p: Promise<unknown>) => {
  const e: unknown = await p.catch((err: unknown) => err);
  if (!(e instanceof HttpException)) throw new Error('expected an HttpException');
  return [e.getStatus(), (e.getResponse() as { code?: string }).code];
};

describe('fetchCrmMedia (the SSRF-guarded GET of one old-CRM file)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('GETs exactly the link, never following a redirect, with a 10 s timeout', async () => {
    const fetch = stubFetch(async () => crmResponse(5));
    expect((await fetchCrmMedia(input)).byteLength).toBe(5);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[0]).toBe(url.href);
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual', signal: expect.any(AbortSignal) });
    expect(CRM_FETCH_TIMEOUT_MS).toBe(10_000);
  });

  it('a redirect (3xx) is refused: 410, the target is never fetched', async () => {
    const fetch = stubFetch(async () => crmResponse(0, { location: 'https://evil.example/x' }, 302));
    expect(await status(fetchCrmMedia(input))).toEqual([410, 'media_expired']);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('404, 500 or an unreachable host → 410 media_expired', async () => {
    stubFetch(async () => crmResponse(0, {}, 404));
    expect(await status(fetchCrmMedia(input))).toEqual([410, 'media_expired']);
    stubFetch(async () => crmResponse(0, {}, 500));
    expect(await status(fetchCrmMedia(input))).toEqual([410, 'media_expired']);
    stubFetch(async () => Promise.reject(new TypeError('fetch failed')));
    expect(await status(fetchCrmMedia(input))).toEqual([410, 'media_expired']);
  });

  it('a content type outside the row\'s family is refused (410)', async () => {
    stubFetch(async () => crmResponse(5, { 'content-type': 'text/html' }));
    expect(await status(fetchCrmMedia(input))).toEqual([410, 'media_expired']);
    stubFetch(async () => crmResponse(5, {}));
    expect(await status(fetchCrmMedia(input))).toEqual([410, 'media_expired']);
  });

  it('over the cap → 413, by content-length or while streaming', async () => {
    stubFetch(async () => crmResponse(5, { 'content-type': 'image/webp', 'content-length': '101' }));
    expect(await status(fetchCrmMedia(input))).toEqual([413, 'invoice_too_large']);
    stubFetch(async () => crmResponse(101));
    expect(await status(fetchCrmMedia(input))).toEqual([413, 'invoice_too_large']);
  });

  it('an empty body is not a file (410)', async () => {
    stubFetch(async () => crmResponse(0));
    expect(await status(fetchCrmMedia(input))).toEqual([410, 'media_expired']);
  });

  it('exactly the cap is fine', async () => {
    stubFetch(async () => crmResponse(100));
    expect((await fetchCrmMedia(input)).byteLength).toBe(100);
  });
});

describe('sameFamily', () => {
  it('image/audio/video by family; anything else exactly', () => {
    expect(sameFamily('image/jpeg', 'image/webp')).toBe(true);
    expect(sameFamily('audio/ogg; codecs=opus', 'audio/ogg')).toBe(true);
    expect(sameFamily('video/mp4', 'audio/mpeg')).toBe(false);
    expect(sameFamily('application/pdf', 'application/pdf')).toBe(true);
    expect(sameFamily('application/octet-stream', 'application/pdf')).toBe(false);
    expect(sameFamily(null, 'image/webp')).toBe(false);
  });
});
