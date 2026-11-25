import { describe, expect, it } from 'vitest';
import { fileLineOf, fileTitleOf, megabytes } from '.';

describe('megabytes', () => {
  it('one decimal under 10 MB, whole above, never 0', () => {
    expect(megabytes(838_861)).toBe('0.8');
    expect(megabytes(19 * 1024 * 1024 + 300_000)).toBe('19');
    expect(megabytes(10)).toBe('0.1');
  });
});

describe('fileTitleOf / fileLineOf', () => {
  const words = {
    kinds: { homework: 'واجب', voice_note: 'ملاحظة', whiteboard: 'سبورة', material: 'ملف' },
    media: { image: 'صورة', pdf: 'PDF', audio: 'صوت' },
    sizeMb: '{n} م.ب',
  };
  const file = { title: null, kind: 'homework' as const, media: 'image' as const, size: 838_861 };

  it('names an untitled file by its kind, and writes kind · media · size', () => {
    expect(fileTitleOf(file, words)).toBe('واجب');
    expect(fileTitleOf({ ...file, title: 'ورقة' }, words)).toBe('ورقة');
    expect(fileLineOf(file, words)).toBe('واجب · صورة · 0.8 م.ب');
  });
});
