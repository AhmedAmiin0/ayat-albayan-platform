import ar from '@ab/shared/i18n/ar.json' with { type: 'json' };
import en from '@ab/shared/i18n/en.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { fillSlots, rangeLabel, rangeMeta, rangePages, rangeSummary } from '../../index.js';

const v2 = ar.reports.v2;
const mulk = { surah: 67, from: 16, to: 22 };

describe('v2 range sentences', () => {
  it('fills known slots and keeps unknown ones', () => {
    expect(fillSlots('{a}–{b} {c}', { a: 1, b: 'x' })).toBe('1–x {c}');
  });

  it('names the range in the UI language', () => {
    expect(rangeLabel(mulk, { words: v2, lang: 'ar' })).toBe('سورة الملك · الآيات 16–22');
    expect(rangeLabel(mulk, { words: en.reports.v2, lang: 'en' })).toBe('Surah Al-Mulk · ayahs 16–22');
  });

  it('counts the ayahs and the pages (one page or a span)', () => {
    expect(rangeMeta(mulk, v2)).toBe('7 آيات · ص 563');
    expect(rangeMeta({ surah: 67, from: 1, to: 15 }, v2)).toBe('15 آية · ص 562–563');
    expect(rangeMeta({ surah: 112, from: 1, to: 1 }, v2)).toBe('آية واحدة · ص 604');
    expect(rangePages({ surah: 67, from: 1, to: 15 })).toBe('562–563');
  });

  it('sums the picked range for the picker', () => {
    expect(rangeSummary(mulk, { ayahs: v2.ayahs, summary: v2.picker.summary })).toBe(
      '7 آيات · الصفحة 563 · الجزء 29.',
    );
  });
});
