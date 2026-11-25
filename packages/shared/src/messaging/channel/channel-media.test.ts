import { describe, expect, it } from 'vitest';
import {
  CHANNEL_MEDIA_MIMES,
  channelAttachmentInputSchema,
  channelKindOf,
  channelMessageKindOf,
  channelUploadSchema,
} from './channel-media';

const MiB = 1024 * 1024;
const file = (mime: string, size: number) => ({ mime, size, name: 'ملف' });

describe('channel files: types and size caps (migration 20261117090300)', () => {
  it('photos and voice notes up to 10 MiB, a PDF up to 15 MiB', () => {
    expect(channelUploadSchema.safeParse(file('image/png', 10 * MiB)).success).toBe(true);
    expect(channelUploadSchema.safeParse(file('image/jpeg', 10 * MiB + 1)).success).toBe(false);
    expect(channelUploadSchema.safeParse(file('application/pdf', 15 * MiB)).success).toBe(true);
    expect(channelUploadSchema.safeParse(file('application/pdf', 15 * MiB + 1)).success).toBe(false);
    expect(channelUploadSchema.safeParse(file('audio/webm', 11 * MiB)).success).toBe(false);
  });

  it('another type, an empty file or no name is refused', () => {
    expect(channelUploadSchema.safeParse(file('video/mp4', 10)).success).toBe(false);
    expect(channelUploadSchema.safeParse(file('image/png', 0)).success).toBe(false);
    expect(channelUploadSchema.safeParse({ mime: 'image/png', size: 1, name: ' ' }).success).toBe(
      false,
    );
  });

  it('each type shows as its kind', () => {
    const kinds = CHANNEL_MEDIA_MIMES.map((m) => [m, channelKindOf(m)]);
    expect(Object.fromEntries(kinds)).toEqual({
      'image/jpeg': 'photo',
      'image/png': 'photo',
      'application/pdf': 'pdf',
      'audio/mp4': 'voice',
      'audio/aac': 'voice',
      'audio/mpeg': 'voice',
      'audio/ogg': 'voice',
      'audio/webm': 'voice',
    });
  });

  it('a stored kind reads as itself; absent or unknown is text', () => {
    expect(['voice', null, undefined, 'video'].map(channelMessageKindOf)).toEqual([
      'voice',
      'text',
      'text',
      'text',
    ]);
  });

  it('a posted file carries its path and maybe its length', () => {
    const voice = { ...file('audio/mp4', 2000), path: 'c1/v.m4a', duration_ms: 4200 };
    expect(channelAttachmentInputSchema.parse(voice)).toEqual(voice);
    expect(channelAttachmentInputSchema.safeParse({ ...voice, path: '' }).success).toBe(false);
    expect(channelAttachmentInputSchema.safeParse({ ...voice, duration_ms: -1 }).success).toBe(
      false,
    );
  });

  it('a file name loses its control and bidi characters; nothing left is refused', () => {
    const spoof = { ...file('application/pdf', 10), path: 'c1/f.pdf', name: ' \u202Efdp.exe\u200F ' };
    expect(channelAttachmentInputSchema.parse(spoof).name).toBe('fdp.exe');
    const bare = { ...spoof, name: '\u2066\u202E\u0007' };
    expect(channelAttachmentInputSchema.safeParse(bare).success).toBe(false);
    const long = channelUploadSchema.parse({ ...file('image/png', 1), name: 'ب'.repeat(300) });
    expect(long.name).toHaveLength(200);
  });
});
