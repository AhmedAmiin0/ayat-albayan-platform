import { describe, expect, it } from 'vitest';
import { reportContentSchema, type ReportContentInput } from './content.js';
import { legacyTexts } from './legacy.js';

const content = (c: ReportContentInput) => reportContentSchema.parse(c);
const label = (topic: string) => `label:${topic}`;

describe('legacyTexts: the v1 sheet text columns of a v2 report', () => {
  it('writes one part as «<surah> <from>–<to>»', () => {
    const texts = legacyTexts(content({ segments: [{ kind: 'new', surah: 67, from: 16, to: 22 }] }), label);
    expect(texts).toEqual({ recited: null, newMemorization: 'الملك 16–22', revision: null, theory: null });
  });

  it('joins several parts of one track with «، », in form order', () => {
    const segments = [
      { kind: 'revision' as const, surah: 78, from: 1, to: 40 },
      { kind: 'recited' as const, surah: 1, from: 1, to: 7 },
      { kind: 'revision' as const, surah: 79, from: 1, to: 10 },
    ];
    const texts = legacyTexts(content({ segments }), label);
    expect(texts.revision).toBe('النبإ 1–40، النازعات 1–10');
    expect(texts.recited).toBe('الفاتحة 1–7');
  });

  it('no parts: every track is null', () => {
    expect(legacyTexts(content({}), label)).toEqual({ recited: null, newMemorization: null, revision: null, theory: null });
  });

  it('theory: the tajweed label, else the Arabic or Islamic topic', () => {
    expect(legacyTexts(content({ tajweed: 'madd' }), label).theory).toBe('label:madd');
    expect(legacyTexts(content({ arabic: { topic: 'الفاعل' } }), label).theory).toBe('الفاعل');
    expect(legacyTexts(content({ islamic: { topic: 'الوضوء' } }), label).theory).toBe('الوضوء');
  });
});
