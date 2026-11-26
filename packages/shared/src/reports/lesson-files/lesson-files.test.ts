import { describe, expect, it } from 'vitest';
import {
  LESSON_FILE_KINDS,
  lessonFileKindSchema,
  lessonFileMediaOf,
  lessonFileRegisterSchema,
  lessonFileUploadSchema,
  portalLessonFileSchema,
} from '.';

describe('lessonFileMediaOf', () => {
  it('reads the top type: image, audio, else pdf', () => {
    expect(lessonFileMediaOf('image/png')).toBe('image');
    expect(lessonFileMediaOf('audio/mp4')).toBe('audio');
    expect(lessonFileMediaOf('application/pdf')).toBe('pdf');
  });
});

describe('lessonFileUploadSchema', () => {
  it('takes a bucket type within 25 MiB and a kind', () => {
    const ok = lessonFileUploadSchema.safeParse({ mime: 'application/pdf', size: 10, kind: 'homework' });
    expect(ok.success).toBe(true);
  });

  it('refuses a video, an oversize file and an unknown kind', () => {
    const bad = [
      { mime: 'video/mp4', size: 10, kind: 'homework' },
      { mime: 'image/png', size: 26 * 1024 * 1024, kind: 'homework' },
      { mime: 'image/png', size: 10, kind: 'invoice' },
    ];
    for (const b of bad) expect(lessonFileUploadSchema.safeParse(b).success).toBe(false);
  });
});

describe('lessonFileRegisterSchema', () => {
  it('shows a new file to the family by default and trims the title', () => {
    const v = lessonFileRegisterSchema.parse({
      mime: 'audio/mpeg', size: 5, kind: 'voice_note', path: 'l/x.mp3', title: '  ورقة  ',
    });
    expect(v.visible_to_family).toBe(true);
    expect(v.title).toBe('ورقة');
  });
});

describe('portalLessonFileSchema', () => {
  it('drops the visibility flag the family never needs', () => {
    const v = portalLessonFileSchema.parse({
      id: 'f', lesson_id: 'l', kind: 'material', title: null, mime: 'application/pdf', size: 1,
      media: 'pdf', visible_to_family: true, created_at: '2026-11-17T10:00:00.000Z',
    });
    expect('visible_to_family' in v).toBe(false);
  });
});

describe('lessonFileKindSchema', () => {
  it('accepts each lesson file kind and nothing else', () => {
    expect(lessonFileKindSchema.options).toEqual([...LESSON_FILE_KINDS]);
    expect(lessonFileKindSchema.validate('video')).toBe(false);
  });
});
