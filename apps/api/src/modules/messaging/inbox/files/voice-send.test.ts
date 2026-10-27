import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../../common/storage/storage.service';
import { voiceMedia, voiceOggPath } from './voice-send';

const M4A = { bucket: 'wa-media' as const, path: 'out/actor/req/5b0f.m4a' };
const BYTES = new Uint8Array([1, 2, 3]);
const OGG = new TextEncoder().encode('OggS');

const fakeStorage = (bytes: Uint8Array | null = BYTES) => {
  const storage = { download: vi.fn(async () => bytes), upload: vi.fn(async () => undefined) };
  return { storage, as: storage as unknown as StorageService };
};

describe('voiceOggPath', () => {
  it('a fixed voice.ogg in the same request folder', () => {
    expect(voiceOggPath(M4A.path)).toBe('out/actor/req/voice.ogg');
  });
});

describe('voiceMedia (owner 2026-10-27)', () => {
  it('transcoded: uploads the ogg beside the m4a and sends it as audio/ogg', async () => {
    const { storage, as } = fakeStorage();
    const transcode = vi.fn(async () => OGG);
    await expect(voiceMedia(as, M4A, transcode)).resolves.toEqual({
      media_path: 'out/actor/req/voice.ogg',
      media_mime: 'audio/ogg',
      media_name: 'voice.ogg',
    });
    expect(transcode).toHaveBeenCalledWith(BYTES);
    expect(storage.upload).toHaveBeenCalledWith({ bucket: 'wa-media', path: 'out/actor/req/voice.ogg', body: OGG, contentType: 'audio/ogg' });
  });

  it('no ffmpeg (or it failed): the m4a itself, nothing uploaded', async () => {
    const { storage, as } = fakeStorage();
    await expect(voiceMedia(as, M4A, async () => null)).resolves.toEqual({ media_path: M4A.path, media_mime: 'audio/mp4', media_name: 'voice.m4a' });
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('the m4a cannot be read: the m4a path is sent as is, no transcode', async () => {
    const { as } = fakeStorage(null);
    const transcode = vi.fn(async () => OGG);
    await expect(voiceMedia(as, M4A, transcode)).resolves.toMatchObject({ media_path: M4A.path, media_mime: 'audio/mp4' });
    expect(transcode).not.toHaveBeenCalled();
  });
});
