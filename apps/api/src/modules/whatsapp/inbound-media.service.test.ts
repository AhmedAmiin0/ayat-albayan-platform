import { INVOICE_MAX_BYTES } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../common/storage/storage.service';
import type { InboundMediaQueries, MediaMessage } from './inbound-media.queries';
import { baseMime, InboundMedia, mediaExpired } from './inbound-media.service';
import { WaError, type WhatsappClient } from './whatsapp.types';

const NOW = new Date('2026-10-03T10:00:00Z');
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const msg = (over: Partial<MediaMessage> = {}): MediaMessage => ({
  id: 'm1',
  phone_e164: '+966552147730',
  direction: 'inbound',
  media_id: 'wamid-media-1',
  media_mime: 'image/jpeg',
  media_path: null,
  body: null,
  created_at: day(2),
  ...over,
});

function setup(row: MediaMessage | null) {
  const queries = { message: vi.fn().mockResolvedValue(row), setPath: vi.fn().mockResolvedValue(undefined) };
  const client = { getMedia: vi.fn().mockResolvedValue({ bytes: new Uint8Array([1, 2, 3]), mime: 'image/jpeg' }) };
  const storage = { upload: vi.fn().mockResolvedValue(undefined) };
  const media = new InboundMedia(
    queries as unknown as InboundMediaQueries,
    client as unknown as WhatsappClient,
    storage as unknown as StorageService,
  );
  return { media, queries, client, storage };
}
const status = async (p: Promise<unknown>) => {
  const e: unknown = await p.catch((err: unknown) => err);
  if (!(e instanceof HttpException)) throw new Error('expected an HttpException');
  return { status: e.getStatus(), body: e.getResponse() };
};

describe('InboundMedia.ensure (R-MSG-06)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW }));
  afterEach(() => vi.useRealTimers());

  it('downloads from Meta once, caches in wa-media and remembers the path', async () => {
    const { media, client, storage, queries } = setup(msg());
    expect(await media.ensure('m1')).toEqual({ bucket: 'wa-media', path: 'm1.jpg', mime: 'image/jpeg' });
    expect(client.getMedia).toHaveBeenCalledWith('wamid-media-1');
    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: 'wa-media', path: 'm1.jpg', contentType: 'image/jpeg' }),
    );
    expect(queries.setPath).toHaveBeenCalledWith('m1', 'm1.jpg');
  });

  it('a cached message is not fetched again, even past the 29 days', async () => {
    const { media, client } = setup(msg({ media_path: 'm1.jpg', created_at: day(40) }));
    expect(await media.ensure('m1')).toMatchObject({ path: 'm1.jpg' });
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('older than 29 days and never cached → 410 media_expired, nothing fetched', async () => {
    const { media, client } = setup(msg({ created_at: day(29.5) }));
    expect(await status(media.ensure('m1'))).toMatchObject({ status: 410, body: { code: 'media_expired' } });
    expect(client.getMedia).not.toHaveBeenCalled();
  });

  it('28 days old is still fetched', async () => {
    const { media } = setup(msg({ created_at: day(28) }));
    await expect(media.ensure('m1')).resolves.toMatchObject({ path: 'm1.jpg' });
  });

  it('Meta refusing the media id (4xx) → 410; any other failure is an error', async () => {
    const { media, client } = setup(msg());
    client.getMedia.mockRejectedValueOnce(new WaError('gone', { code: 100, status: 404 }));
    expect(await status(media.ensure('m1'))).toMatchObject({ status: 410, body: { code: 'media_expired' } });
    client.getMedia.mockRejectedValueOnce(new WaError('down', { code: null, status: 503 }));
    await expect(media.ensure('m1')).rejects.toBeInstanceOf(WaError);
  });

  it('over 10 MB → 413 invoice_too_large, nothing stored', async () => {
    const { media, client, storage } = setup(msg());
    client.getMedia.mockResolvedValue({ bytes: new Uint8Array(INVOICE_MAX_BYTES + 1), mime: 'image/jpeg' });
    expect(await status(media.ensure('m1'))).toMatchObject({ status: 413, body: { code: 'invoice_too_large' } });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it.each([
    ['audio', { media_mime: 'audio/ogg' }],
    ['no media id (a text)', { media_id: null }],
    ['an outbound message', { direction: 'outbound' as const }],
  ])('%s → 400 invoice_message', async (_name, over) => {
    const { media } = setup(msg(over));
    expect(await status(media.ensure('m1'))).toMatchObject({ status: 400, body: { code: 'invoice_message' } });
  });

  it('an unknown message → 404 message_not_found', async () => {
    const { media } = setup(null);
    expect(await status(media.ensure('nope'))).toMatchObject({ status: 404, body: { code: 'message_not_found' } });
  });

  it('a mime with parameters is matched on its base type', async () => {
    const { media } = setup(msg({ media_mime: 'image/png; q=1' }));
    expect(await media.ensure('m1')).toMatchObject({ path: 'm1.png', mime: 'image/png' });
  });
});

describe('helpers', () => {
  it('baseMime strips parameters and case', () => {
    expect(baseMime('Image/JPEG; x=1')).toBe('image/jpeg');
    expect(baseMime(null)).toBe('');
  });

  it('mediaExpired: only an uncached file past 29 days', () => {
    expect(mediaExpired({ created_at: day(30), media_path: null }, NOW)).toBe(true);
    expect(mediaExpired({ created_at: day(30), media_path: 'x' }, NOW)).toBe(false);
    expect(mediaExpired({ created_at: day(29), media_path: null }, NOW)).toBe(false);
  });
});
