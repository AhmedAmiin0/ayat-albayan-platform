import { HttpException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../common/storage/storage.service';
import type { InboundMediaQueries, MediaMessage } from './inbound-media.queries';
import { InboundMedia } from './inbound-media.service';
import { WaError, type WhatsappLines } from './whatsapp.types';

// docs/12 §13.4: the media id only works with the RECEIVING line's token.
const NOW = new Date('2026-10-10T10:00:00Z');
const msg = (over: Partial<MediaMessage> = {}): MediaMessage => ({
  id: 'm1',
  phone_e164: '+966552147730',
  direction: 'inbound',
  media_id: 'meta-media-1',
  media_mime: 'image/jpeg',
  media_path: null,
  body: null,
  created_at: new Date(NOW.getTime() - 86_400_000).toISOString(),
  line: null,
  ...over,
});
const fakeClient = () => ({
  configured: vi.fn(() => true),
  getMedia: vi.fn().mockResolvedValue({ bytes: new Uint8Array([1]), mime: 'image/jpeg' }),
});

function setup(row: MediaMessage) {
  const queries = { message: vi.fn().mockResolvedValue(row), setPath: vi.fn().mockResolvedValue(undefined) };
  const notifications = fakeClient();
  const chat = fakeClient();
  const storage = { upload: vi.fn().mockResolvedValue(undefined) };
  const media = new InboundMedia(
    queries as unknown as InboundMediaQueries,
    { notifications, chat } as unknown as WhatsappLines,
    storage as unknown as StorageService,
  );
  return { media, notifications, chat, storage };
}
const failure = async (p: Promise<unknown>) => {
  const e: unknown = await p.catch((err: unknown) => err);
  if (!(e instanceof HttpException)) throw new Error('expected an HttpException');
  return { status: e.getStatus(), body: e.getResponse() };
};

describe('InboundMedia per line (docs/12 §13.4, R-MSG-06)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW }));
  afterEach(() => vi.useRealTimers());

  it('a chat-stamped message downloads through the chat client', async () => {
    const { media, notifications, chat } = setup(msg({ line: 'chat' }));
    await expect(media.ensure('m1')).resolves.toMatchObject({ path: 'm1.jpg' });
    expect(chat.getMedia).toHaveBeenCalledWith('meta-media-1');
    expect(notifications.getMedia).not.toHaveBeenCalled();
  });

  it('a null-line or notifications-stamped message downloads through the notifications client', async () => {
    for (const line of [null, 'notifications'] as const) {
      const { media, notifications, chat } = setup(msg({ line }));
      await expect(media.ensure('m1')).resolves.toMatchObject({ path: 'm1.jpg' });
      expect(notifications.getMedia).toHaveBeenCalledWith('meta-media-1');
      expect(chat.getMedia).not.toHaveBeenCalled();
    }
  });

  it('a chat-stamped message with the chat line unconfigured → 503 line_not_configured, zero requests', async () => {
    const { media, notifications, chat, storage } = setup(msg({ line: 'chat' }));
    chat.configured.mockReturnValue(false);
    expect(await failure(media.ensure('m1'))).toMatchObject({ status: 503, body: { code: 'line_not_configured' } });
    expect(chat.getMedia).not.toHaveBeenCalled();
    expect(notifications.getMedia).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('a cached chat file still serves while the chat line is unconfigured', async () => {
    const { media, chat } = setup(msg({ line: 'chat', media_path: 'm1.jpg' }));
    chat.configured.mockReturnValue(false);
    await expect(media.ensure('m1')).resolves.toMatchObject({ path: 'm1.jpg' });
  });

  it.each([190, 10, 200])('chat unset, Meta auth error %i on notifications → 502 meta_error with meta_code', async (code) => {
    const { media, notifications, chat, storage } = setup(msg());
    chat.configured.mockReturnValue(false);
    notifications.getMedia.mockRejectedValue(new WaError('auth', { code, status: 401 }));
    const res = await failure(media.ensure('m1'));
    expect(res).toMatchObject({ status: 502, body: { code: 'meta_error', meta_code: code } });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('Kapso refusing its key (docs/19) → 502 meta_error, never 410 media_expired', async () => {
    const { media, notifications, chat } = setup(msg());
    chat.configured.mockReturnValue(false);
    notifications.getMedia.mockRejectedValue(new WaError('Kapso refused the API key', { code: null, status: 401, credential: 'kapso' }));
    expect(await failure(media.ensure('m1'))).toMatchObject({ status: 502, body: { code: 'meta_error' } });
  });

  it.each([400, 404])('chat unset, any other Meta %i → 410 media_expired', async (status) => {
    const { media, notifications, chat } = setup(msg());
    chat.configured.mockReturnValue(false);
    notifications.getMedia.mockRejectedValue(new WaError('gone', { code: 100, status }));
    expect(await failure(media.ensure('m1'))).toMatchObject({ status: 410, body: { code: 'media_expired' } });
  });

  it('an auth error on the chat line is 502 too, not an expired file', async () => {
    const { media, chat } = setup(msg({ line: 'chat' }));
    chat.getMedia.mockRejectedValue(new WaError('token', { code: 190, status: 401 }));
    expect(await failure(media.ensure('m1'))).toMatchObject({ status: 502, body: { code: 'meta_error', meta_code: 190 } });
  });

  it('a Kapso refused key (tagged by byDriver, body code 401) is 502 meta_error, not a 410 expired file', async () => {
    const { media, notifications } = setup(msg());
    notifications.getMedia.mockRejectedValue(new WaError('Kapso refused the API key', { code: 401, status: 401, credential: 'kapso' }));
    expect(await failure(media.ensure('m1'))).toMatchObject({ status: 502, body: { code: 'meta_error', meta_code: 401 } });
  });

  it('an untagged 401 (Kapso download_url sent no key) is an expired link: 410 media_expired', async () => {
    const { media, notifications } = setup(msg());
    notifications.getMedia.mockRejectedValue(new WaError('WhatsApp HTTP 401', { code: null, status: 401 }));
    expect(await failure(media.ensure('m1'))).toMatchObject({ status: 410, body: { code: 'media_expired' } });
  });
});
