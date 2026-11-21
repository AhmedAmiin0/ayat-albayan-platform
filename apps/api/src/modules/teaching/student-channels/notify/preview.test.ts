import { describe, expect, it } from 'vitest';
import { previewOf } from './preview';

describe('a channel message in a push or bell row', () => {
  it('its text (80 characters at most), else what it carries', () => {
    expect(previewOf({ body: 'x'.repeat(100) })).toBe('x'.repeat(80));
    expect(previewOf({ body: '', kind: 'photo' })).toBe('صورة');
    expect(previewOf({ body: '', kind: 'voice' })).toBe('رسالة صوتية');
    expect(previewOf({ body: 'تعليق', kind: 'pdf' })).toBe('تعليق');
  });
});

describe('a preview cut at the limit (code points, finding 3)', () => {
  it('an emoji on the boundary is never split into a lone surrogate', () => {
    const shown = previewOf({ body: `${'ب'.repeat(79)}😀 وبعد` });
    expect(shown).toBe(`${'ب'.repeat(79)}😀`);
  });
});
