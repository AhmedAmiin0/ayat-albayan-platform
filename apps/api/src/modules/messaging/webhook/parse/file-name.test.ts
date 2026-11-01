import { describe, expect, it } from 'vitest';
import { mediaFileName } from './file-name';

describe('mediaFileName (messages.media_name: 1–200 characters once trimmed)', () => {
  it('keeps a name, trimmed', () => {
    expect(mediaFileName('  خطة الحفظ.pdf ')).toBe('خطة الحفظ.pdf');
  });
  it('cuts a long name to 200 characters, never past the check', () => {
    expect(mediaFileName(`${'a'.repeat(250)}.pdf`)).toHaveLength(200);
    expect(mediaFileName(`${'a'.repeat(199)} b`)).toBe('a'.repeat(199));
  });
  it.each([null, undefined, '', '   '])('%j: null', (raw) => {
    expect(mediaFileName(raw)).toBeNull();
  });
});
