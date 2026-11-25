import { describe, expect, it } from 'vitest';
import { clipText, sliceCodePoints } from './text-clip';

// A push or bell row quotes the start of a message: cut by code points, never inside an emoji's
// surrogate pair (a lone surrogate shows as «�» and breaks some push providers' JSON).

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

describe('sliceCodePoints', () => {
  it('an emoji right at the limit stays whole or goes whole', () => {
    const text = `${'x'.repeat(79)}😀 بعد`;
    expect(sliceCodePoints(text, 80)).toBe(`${'x'.repeat(79)}😀`);
    expect(sliceCodePoints(text, 79)).toBe('x'.repeat(79));
    expect(LONE_SURROGATE.test(sliceCodePoints(text, 80))).toBe(false);
  });

  it('Arabic and short text: as is up to the limit', () => {
    expect(sliceCodePoints('السلام عليكم', 6)).toBe('السلام');
    expect(sliceCodePoints('سلام', 80)).toBe('سلام');
    expect(sliceCodePoints('', 80)).toBe('');
  });
});

describe('clipText', () => {
  it('longer than the limit: limit - 1 code points and «…»', () => {
    const text = `${'ا'.repeat(58)}🌙🌙🌙`;
    const shown = clipText(text, 60);
    expect(shown).toBe(`${'ا'.repeat(58)}🌙…`);
    expect(Array.from(shown)).toHaveLength(60);
    expect(LONE_SURROGATE.test(shown)).toBe(false);
  });

  it('within the limit counted by code points: unchanged (emoji count once)', () => {
    const text = `${'ا'.repeat(58)}🌙🌙`;
    expect(clipText(text, 60)).toBe(text);
    expect(clipText('مرحبا', 60)).toBe('مرحبا');
  });
});
