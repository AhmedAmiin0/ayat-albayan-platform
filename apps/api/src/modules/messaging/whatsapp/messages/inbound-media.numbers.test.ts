import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../../common/storage/storage.service';
import type { InboundMediaQueries, MediaMessage } from './inbound-media.queries';
import { InboundMedia } from './inbound-media.service';
import type { WhatsappLines } from '../whatsapp.types';

// Owner 2026-10-27: the old CRM number's history (line null) was fetched with the NOTIFICATIONS client.
const row = (over: Partial<MediaMessage>): MediaMessage => ({
  id: 'm1', phone_e164: '+966500000001', direction: 'inbound', media_id: 'mid-1', media_mime: 'audio/ogg; codecs=opus',
  media_path: null, body: null, created_at: new Date().toISOString(), line: null, ...over,
});
const lineClient = () => ({ configured: vi.fn(() => true), getMedia: vi.fn().mockResolvedValue({ bytes: new Uint8Array([1]), mime: 'audio/ogg' }) });

function setup(msg: MediaMessage) {
  const queries = { message: vi.fn().mockResolvedValue(msg), setPath: vi.fn().mockResolvedValue(undefined) };
  const lines = { notifications: lineClient(), chat: lineClient() };
  const storage = { upload: vi.fn().mockResolvedValue(undefined) };
  const media = new InboundMedia(queries as unknown as InboundMediaQueries, lines as unknown as WhatsappLines, storage as unknown as StorageService);
  return { media, lines, storage, queries };
}

describe('InboundMedia by number', () => {
  it('a crm-number row → 409 crm_no_media; neither line client is called, nothing stored', async () => {
    const { media, lines, storage } = setup(row({ number: { id: 'n-old', provider: 'crm', purpose: 'chat' } }));
    const e: unknown = await media.cache(await media.loadChat('m1')).catch((err: unknown) => err);
    expect(e instanceof HttpException && [e.getStatus(), e.getResponse()]).toEqual([409, { code: 'crm_no_media', message: 'crm_no_media' }]);
    expect([lines.notifications.getMedia, lines.chat.getMedia, storage.upload].map((f) => f.mock.calls.length)).toEqual([0, 0, 0]);
  });

  it('a line-null row of a chat number (legacy) is fetched with the chat client, not notifications', async () => {
    const { media, lines } = setup(row({ number: { id: 'n-chat', provider: 'kapso', purpose: 'chat' } }));
    await media.cache(await media.loadChat('m1'));
    expect(lines.chat.getMedia).toHaveBeenCalledWith('mid-1');
    expect(lines.notifications.getMedia).not.toHaveBeenCalled();
  });

  it('an echo (outbound, media id) passes loadChat and is cached once with its line\'s client', async () => {
    const { media, lines, queries } = setup(row({ direction: 'outbound', line: 'chat' }));
    await expect(media.cache(await media.loadChat('m1'))).resolves.toEqual({ bucket: 'wa-media', path: 'm1.ogg', mime: 'audio/ogg' });
    expect(lines.chat.getMedia).toHaveBeenCalledTimes(1);
    expect(queries.setPath).toHaveBeenCalledWith('m1', 'm1.ogg');
  });

  it('loadChat: an outbound row without a media id is 410; an unknown id 404', async () => {
    const { media, queries } = setup(row({ direction: 'outbound', media_id: null }));
    await expect(media.loadChat('m1')).rejects.toMatchObject({ status: 410 });
    queries.message.mockResolvedValue(null);
    await expect(media.loadChat('m1')).rejects.toMatchObject({ status: 404 });
  });
});
