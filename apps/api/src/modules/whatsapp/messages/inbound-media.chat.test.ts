import { INVOICE_MAX_BYTES, PLAYABLE_MAX_BYTES, isChatViewMime } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../common/storage/storage.service';
import type { InboundMediaQueries, MediaMessage } from './inbound-media.queries';
import { InboundMedia, servable } from './inbound-media.service';
import type { WhatsappLines } from '../whatsapp.types';

// Owner 2026-10-19 #1: the chat bubble (W6) serves voice notes and videos up to 16 MB; the default
// gate (booking «من الشات», sales receipt copy) stays images / PDFs.

const msg = (over: Partial<MediaMessage> = {}): MediaMessage => ({
  id: 'm1',
  phone_e164: '+966552147730',
  direction: 'inbound',
  media_id: 'wamid-media-1',
  media_mime: 'audio/ogg; codecs=opus',
  media_path: null,
  body: null,
  created_at: new Date().toISOString(),
  line: null,
  ...over,
});

function setup(row: MediaMessage, size = 3) {
  const queries = { message: vi.fn().mockResolvedValue(row), setPath: vi.fn().mockResolvedValue(undefined) };
  const client = { getMedia: vi.fn().mockResolvedValue({ bytes: new Uint8Array(size), mime: 'x' }) };
  const storage = { upload: vi.fn().mockResolvedValue(undefined) };
  const lines = { notifications: client, chat: client } as unknown as WhatsappLines;
  const media = new InboundMedia(queries as unknown as InboundMediaQueries, lines, storage as unknown as StorageService);
  return { media, storage, queries };
}
const code = async (p: Promise<unknown>) => {
  const e: unknown = await p.catch((err: unknown) => err);
  if (!(e instanceof HttpException)) throw new Error('expected an HttpException');
  return { status: e.getStatus(), body: e.getResponse() };
};

describe('InboundMedia for the chat bubble (D1)', () => {
  it('a voice note with codecs is cached as .ogg with contentType audio/ogg', async () => {
    const { media, storage, queries } = setup(msg());
    const file = await media.cache(await media.load('m1', isChatViewMime));
    expect(file).toEqual({ bucket: 'wa-media', path: 'm1.ogg', mime: 'audio/ogg' });
    expect(storage.upload).toHaveBeenCalledWith(expect.objectContaining({ path: 'm1.ogg', contentType: 'audio/ogg' }));
    expect(queries.setPath).toHaveBeenCalledWith('m1', 'm1.ogg');
  });

  it('a 12 MB video is cached (over the 10 MB image cap, under 16 MB)', async () => {
    const { media } = setup(msg({ media_mime: 'video/mp4' }), 12 * 1024 * 1024);
    await expect(media.cache(msg({ media_mime: 'video/mp4' }))).resolves.toMatchObject({ path: 'm1.mp4' });
  });

  it('audio over 16 MB, or an image over 10 MB → 413 invoice_too_large, nothing stored', async () => {
    const audio = setup(msg(), PLAYABLE_MAX_BYTES + 1);
    expect(await code(audio.media.cache(msg()))).toMatchObject({ status: 413, body: { code: 'invoice_too_large' } });
    const image = msg({ media_mime: 'image/jpeg' });
    const photo = setup(image, INVOICE_MAX_BYTES + 1);
    expect(await code(photo.media.cache(image))).toMatchObject({ status: 413 });
    expect([audio.storage.upload, photo.storage.upload].map((f) => f.mock.calls.length)).toEqual([0, 0]);
  });

  it('the default load() still refuses audio with invoice_message', async () => {
    const { media } = setup(msg());
    expect(await code(media.load('m1'))).toMatchObject({ status: 400, body: { code: 'invoice_message' } });
  });
});

describe('servable', () => {
  it('passes an inbound file the predicate allows; the default allows images / PDFs only', () => {
    expect(servable(msg({ media_mime: 'application/pdf' }))).toMatchObject({ id: 'm1' });
    expect(servable(msg(), isChatViewMime)).toMatchObject({ id: 'm1' });
    expect(() => servable(msg())).toThrow(HttpException);
  });

  it('refuses outbound rows, rows without a media id and unknown types even with isChatViewMime', () => {
    for (const over of [{ direction: 'outbound' as const }, { media_id: null }, { media_mime: 'application/zip' }]) {
      expect(() => servable(msg(over), isChatViewMime)).toThrow(HttpException);
    }
  });
});
