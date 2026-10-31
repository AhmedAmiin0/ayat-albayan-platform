import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import type { InboundMedia, InboundMediaQueries, MediaMessage } from '@/modules/messaging/whatsapp';
import { ThreadMediaService } from './thread-media.service';

// The chat pickers' files (owner 2026-10-31: «I get the stickers and I am not able to attach the
// pdf»): photos and PDFs only, a stored copy served as stored, an octet-stream «x.pdf» as a PDF.

const PHONE = '+966552147730';
const CRM_LINK = 'https://crm.example.com/storage/v1/object/public/chat-media/a/1.jpg';
let n = 0;
const msg = (over: Partial<MediaMessage> = {}): MediaMessage => ({
  id: `m${String(++n)}`,
  phone_e164: PHONE,
  direction: 'inbound',
  media_id: 'meta-1',
  media_mime: 'image/jpeg',
  media_path: null,
  body: null,
  created_at: new Date().toISOString(),
  line: 'chat',
  interactive_payload: { type: 'image' },
  ...over,
});
const sticker = () => msg({ media_mime: 'image/webp', interactive_payload: { type: 'sticker' } });
const pdf = (over: Partial<MediaMessage> = {}) =>
  msg({ media_mime: 'application/pdf', interactive_payload: { type: 'document' }, ...over });

const queries = { receipts: vi.fn(), message: vi.fn(), setPath: vi.fn() };
const media = { cache: vi.fn() };
const storage = { signedDownload: vi.fn() };
const service = new ThreadMediaService(
  queries as unknown as InboundMediaQueries,
  media as unknown as InboundMedia,
  storage as unknown as StorageService,
);
const codeOf = async (p: Promise<unknown>) => {
  const e: unknown = await p.catch((err: unknown) => err);
  if (!(e instanceof HttpException)) throw new Error('expected an HttpException');
  return [e.getStatus(), (e.getResponse() as { code?: string }).code];
};

describe('ThreadMediaService pickers: photos and PDFs, never a sticker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    storage.signedDownload.mockResolvedValue({ url: 'https://signed', expires_at: '2026-10-31T11:00:00Z' });
    media.cache.mockImplementation((m: MediaMessage) =>
      Promise.resolve({ bucket: 'wa-media', path: `${m.id}.bin`, mime: m.media_mime }));
  });

  it('a PDF behind 50 stickers still shows; the query is asked for the picker size only', async () => {
    const file = pdf({ media_name: 'فاتورة.pdf' });
    queries.receipts.mockResolvedValue([...Array.from({ length: 50 }, sticker), file]);
    const items = await service.list(PHONE);
    const shown = items.map((i) => [i.message_id, i.mime, i.caption]);
    expect(shown).toEqual([[file.id, 'application/pdf', 'فاتورة.pdf']]);
    const asked = expect.objectContaining({ phone: PHONE, limit: 12 });
    expect(queries.receipts).toHaveBeenCalledWith(asked);
  });

  it('a stored copy with no media id (imported) is listed and signed as stored, nothing fetched', async () => {
    const photo = msg({ media_id: null, media_path: 'crm/1.jpg', body: CRM_LINK, interactive_payload: null });
    const doc = pdf({ media_id: null, media_path: 'imp/2.pdf', media_name: 'إيصال.pdf' });
    queries.receipts.mockResolvedValue([photo, doc]);
    // The old-CRM link is never shown as a caption; the PDF shows its name.
    expect((await service.list(PHONE)).map((i) => i.caption)).toEqual([null, 'إيصال.pdf']);
    for (const [row, path, mime] of [[photo, 'crm/1.jpg', 'image/jpeg'], [doc, 'imp/2.pdf', 'application/pdf']] as const) {
      queries.message.mockResolvedValue(row);
      expect(await service.file({ phone: PHONE, messageId: row.id })).toMatchObject({ url: 'https://signed', mime });
      expect(storage.signedDownload).toHaveBeenLastCalledWith({ bucket: 'wa-media', path });
    }
    expect(media.cache).not.toHaveBeenCalled();
  });

  it('an octet-stream «x.pdf» is listed and cached as a PDF', async () => {
    const payload = { type: 'document', document: { filename: 'receipt.PDF' } };
    const file = msg({ media_mime: 'application/octet-stream', interactive_payload: payload });
    queries.receipts.mockResolvedValue([file]);
    expect((await service.list(PHONE))[0]).toMatchObject({ mime: 'application/pdf', caption: 'receipt.PDF' });
    queries.message.mockResolvedValue(file);
    expect(await service.file({ phone: PHONE, messageId: file.id })).toMatchObject({ mime: 'application/pdf' });
    expect(media.cache).toHaveBeenCalledWith(expect.objectContaining({ id: file.id, media_mime: 'application/pdf' }));
  });

  it('a sticker or a voice note is no picker file: pick null, file 400 invoice_message, nothing fetched', async () => {
    for (const row of [sticker(), msg({ media_mime: 'audio/ogg', interactive_payload: { type: 'audio' } })]) {
      queries.message.mockResolvedValue(row);
      expect(await service.pick({ phone: PHONE, messageId: row.id })).toBeNull();
      expect(await codeOf(service.file({ phone: PHONE, messageId: row.id }))).toEqual([400, 'invoice_message']);
    }
    expect(media.cache).not.toHaveBeenCalled();
  });

  it('another chat, an unknown or a hidden message → 404 message_not_found', async () => {
    for (const row of [msg({ phone_e164: '+201001234567' }), null, msg({ hidden_at: '2026-10-30T00:00:00Z' })]) {
      queries.message.mockResolvedValue(row);
      expect(await codeOf(service.pick({ phone: PHONE, messageId: 'x' }))).toEqual([404, 'message_not_found']);
    }
  });

  it('a file neither stored nor fetchable (imported, no link) → 410 media_expired', async () => {
    queries.message.mockResolvedValue(msg({ media_id: null, interactive_payload: null }));
    expect(await codeOf(service.file({ phone: PHONE, messageId: 'x' }))).toEqual([410, 'media_expired']);
  });
});
