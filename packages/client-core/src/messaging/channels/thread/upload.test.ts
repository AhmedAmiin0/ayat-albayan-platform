import { describe, expect, it, vi } from 'vitest';
import {
  ChannelFileError,
  channelFileCapMb,
  channelFileProblem,
  uploadChannelFile,
} from './upload';

const SLOT = { bucket: 'channel-media', path: 'ch/f.jpg', token: 'tk', signed_url: 'https://x/u' };
const photo = { mime: 'image/jpeg', name: 'صفحة.jpg', size: 2048, bytes: new ArrayBuffer(8) };

const deps = (error: Error | null = null) => ({
  askSlot: vi.fn().mockResolvedValue(SLOT),
  upload: vi.fn().mockResolvedValue({ error }),
});

describe('channel files', () => {
  it('checks the type and the cap of its type before anything is sent', () => {
    expect(channelFileProblem(photo)).toBeNull();
    expect(channelFileProblem({ ...photo, mime: 'video/mp4' })).toBe('badType');
    expect(channelFileProblem({ ...photo, size: 11 * 1024 * 1024 })).toBe('tooLarge');
    expect(channelFileCapMb('image/png')).toBe(10);
    expect(channelFileCapMb('application/pdf')).toBe(15);
    expect(channelFileCapMb('video/mp4')).toBe(15);
  });

  it('asks the slot with the file fields, uploads, and answers the attachment', async () => {
    const d = deps();
    const voice = { ...photo, mime: 'audio/webm', name: 'voice.webm', durationMs: 4200.4 };
    const out = await uploadChannelFile(voice, d);
    expect(d.askSlot).toHaveBeenCalledWith({ mime: 'audio/webm', size: 2048, name: 'voice.webm' });
    expect(d.upload).toHaveBeenCalledWith(SLOT, { body: voice.bytes, contentType: 'audio/webm' });
    expect(out).toMatchObject({ path: 'ch/f.jpg', duration_ms: 4200, mime: 'audio/webm' });
  });

  it('a refused file never asks for a slot; a failed upload is «failed»', async () => {
    const d = deps();
    await expect(uploadChannelFile({ ...photo, mime: 'text/plain' }, d)).rejects.toEqual(
      new ChannelFileError('badType'),
    );
    expect(d.askSlot).not.toHaveBeenCalled();
    const broken = uploadChannelFile(photo, deps(new Error('403')));
    await expect(broken).rejects.toMatchObject({ code: 'failed' });
  });
});
