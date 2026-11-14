import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageService } from '@/common/storage/storage.service';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { WaError, type WhatsappClient } from '@/modules/messaging/whatsapp/whatsapp.types';
import { refusedNow, sendVoiceById, type VoiceAt } from './voice-dispatch';

// 2026-11-14: the ogg by uploaded media id; a refused upload or send → the m4a once, by link.

const OGG_PATH = 'out/u1/r1/voice.ogg';
const M4A_PATH = 'out/u1/r1/voice.m4a';
const OGG = new TextEncoder().encode('OggS');
const refused = () => new WaError('Media upload error', { code: 131053, status: 400 });
const timedOut = () => new WaError('timed out', { code: null, status: 0, uncertain: true });

const voice = { upload: vi.fn(), send: vi.fn() };
const client = { sendDocument: vi.fn() };
const storage = { download: vi.fn(), exists: vi.fn() };
const row = dueMessage({ template_key: null, media_path: OGG_PATH, media_mime: 'audio/ogg', reply_to_wa_id: 'wamid.q' });
const at: VoiceAt = {
  row,
  path: OGG_PATH,
  client: client as unknown as WhatsappClient,
  storage: storage as unknown as StorageService,
  link: async (p) => `https://s.local/${p}`,
};

describe('sendVoiceById', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    storage.download.mockResolvedValue(OGG);
    storage.exists.mockResolvedValue(true);
    voice.upload.mockResolvedValue('media-1');
    voice.send.mockResolvedValue({ waMessageId: 'wamid.ogg' });
    client.sendDocument.mockResolvedValue({ waMessageId: 'wamid.m4a' });
  });

  it('uploads the stored ogg, then sends it by id with the reply; no link, no m4a', async () => {
    await expect(sendVoiceById(at, voice)).resolves.toEqual({ waMessageId: 'wamid.ogg' });
    expect(storage.download).toHaveBeenCalledWith({ bucket: 'wa-media', path: OGG_PATH });
    expect(voice.upload).toHaveBeenCalledWith(OGG);
    expect(voice.send).toHaveBeenCalledWith({ to: row.phone_e164, id: 'media-1', replyTo: 'wamid.q' });
    expect(client.sendDocument).not.toHaveBeenCalled();
  });

  it('a refused upload: the m4a once, plain audio by link, recorded as the sent file', async () => {
    voice.upload.mockRejectedValue(refused());
    await expect(sendVoiceById(at, voice)).resolves.toEqual({
      waMessageId: 'wamid.m4a',
      media: { media_path: M4A_PATH, media_mime: 'audio/mp4', media_name: 'voice.m4a' },
    });
    expect(voice.send).not.toHaveBeenCalled();
    expect(client.sendDocument).toHaveBeenCalledTimes(1);
    expect(client.sendDocument).toHaveBeenCalledWith({
      to: row.phone_e164, kind: 'audio', url: `https://s.local/${M4A_PATH}`, replyTo: 'wamid.q', voice: false,
    });
  });

  it('a send Meta refused (4xx): the m4a once', async () => {
    voice.send.mockRejectedValue(refused());
    await expect(sendVoiceById(at, voice)).resolves.toMatchObject({ waMessageId: 'wamid.m4a' });
    expect(client.sendDocument).toHaveBeenCalledTimes(1);
  });

  it('an uncertain send (timeout) is never followed by the m4a: no double note', async () => {
    voice.send.mockRejectedValue(timedOut());
    await expect(sendVoiceById(at, voice)).rejects.toMatchObject({ info: { uncertain: true } });
    expect(client.sendDocument).not.toHaveBeenCalled();
  });

  it('no m4a kept (a note from before the fallback): the ogg’s own error', async () => {
    storage.exists.mockResolvedValue(false);
    voice.upload.mockRejectedValue(refused());
    await expect(sendVoiceById(at, voice)).rejects.toMatchObject({ info: { code: 131053 } });
    expect(client.sendDocument).not.toHaveBeenCalled();
  });

  it('the ogg missing from Storage: nothing uploaded, the m4a instead', async () => {
    storage.download.mockResolvedValue(null);
    await expect(sendVoiceById(at, voice)).resolves.toMatchObject({ waMessageId: 'wamid.m4a' });
    expect(voice.upload).not.toHaveBeenCalled();
  });
  it('a path outside out/ is never read nor uploaded', async () => {
    storage.exists.mockResolvedValue(false);
    await expect(sendVoiceById({ ...at, path: 'in/x/voice.ogg' }, voice)).rejects.toThrow('missing');
    expect(storage.download).not.toHaveBeenCalled();
    expect(voice.upload).not.toHaveBeenCalled();
  });
});

describe('refusedNow', () => {
  it('only a definite 4xx answer, never uncertain, a 5xx or a non-WaError', () => {
    expect(refusedNow(refused())).toBe(true);
    expect(refusedNow(timedOut())).toBe(false);
    expect(refusedNow(new WaError('x', { code: null, status: 500 }))).toBe(false);
    expect(refusedNow(new WaError('x', { code: 1, status: 400, uncertain: true }))).toBe(false);
    expect(refusedNow(new Error('x'))).toBe(false);
  });
});
