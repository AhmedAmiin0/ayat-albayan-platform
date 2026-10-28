import { describe, expect, it } from 'vitest';
import { JUZ_NAMES, JUZ_STARTS, PAGE_STARTS, SURAHS } from './quran-data.js';
import {
  ayahCount,
  globalAyah,
  isAyah,
  juzOf,
  juzPages,
  nextAyah,
  pageOf,
  rangeInfo,
  searchSurahs,
  surahName,
} from './quran.js';

describe('quran data (Madani mushaf, Hafs)', () => {
  it('has 114 surahs, 6236 ayahs, 604 ascending page starts and 30 juz starts', () => {
    expect(SURAHS).toHaveLength(114);
    expect(SURAHS.reduce((n, s) => n + s[2], 0)).toBe(6236);
    expect(PAGE_STARTS).toHaveLength(604);
    expect(PAGE_STARTS.every((p, i) => i === 0 || p > (PAGE_STARTS[i - 1] ?? 0))).toBe(true);
    expect(JUZ_STARTS).toHaveLength(30);
    expect(JUZ_NAMES).toHaveLength(30);
  });

  it('knows the surahs by name and ayah count', () => {
    expect([surahName(1), ayahCount(1)]).toEqual(['الفاتحة', 7]);
    expect([surahName(2), ayahCount(2)]).toEqual(['البقرة', 286]);
    expect([surahName(67), surahName(67, 'en'), ayahCount(67)]).toEqual(['الملك', 'Al-Mulk', 30]);
    expect([surahName(114), ayahCount(114)]).toEqual(['الناس', 6]);
    expect([surahName(0), ayahCount(115)]).toEqual(['', 0]);
  });

  it('validates places in the mushaf', () => {
    expect(isAyah({ surah: 67, ayah: 30 })).toBe(true);
    expect(isAyah({ surah: 67, ayah: 31 })).toBe(false);
    expect(isAyah({ surah: 115, ayah: 1 })).toBe(false);
    expect(() => globalAyah({ surah: 1, ayah: 8 })).toThrow(RangeError);
    expect([globalAyah({ surah: 1, ayah: 1 }), globalAyah({ surah: 2, ayah: 1 }), globalAyah({ surah: 114, ayah: 6 })]).toEqual([1, 8, 6236]);
  });
});

describe('pages and ajzāʾ', () => {
  it.each([
    { surah: 1, ayah: 1, page: 1, juz: 1 },
    { surah: 2, ayah: 1, page: 2, juz: 1 },
    { surah: 2, ayah: 142, page: 22, juz: 2 },
    { surah: 67, ayah: 1, page: 562, juz: 29 },
    { surah: 67, ayah: 16, page: 563, juz: 29 },
    { surah: 68, ayah: 1, page: 564, juz: 29 },
    { surah: 78, ayah: 1, page: 582, juz: 30 },
    { surah: 114, ayah: 6, page: 604, juz: 30 },
  ])('surah $surah ayah $ayah is on page $page, juz $juz', ({ surah, ayah, page, juz }) => {
    expect(pageOf({ surah, ayah })).toBe(page);
    expect(juzOf({ surah, ayah })).toBe(juz);
  });

  it('gives a juz its pages (juz 29 = 562–581, 20 pages; juz 30 ends at 604)', () => {
    expect(juzPages(1)).toEqual({ first: 1, last: 21, count: 21 });
    expect(juzPages(29)).toEqual({ first: 562, last: 581, count: 20 });
    expect(juzPages(30)).toEqual({ first: 582, last: 604, count: 23 });
    expect(() => juzPages(31)).toThrow(RangeError);
  });

  it('describes a range: ayahs, pages and juz', () => {
    expect(rangeInfo({ surah: 67, from: 16, to: 22 })).toEqual({ ayahs: 7, firstPage: 563, lastPage: 563, juz: 29 });
    expect(rangeInfo({ surah: 67, from: 1, to: 15 })).toEqual({ ayahs: 15, firstPage: 562, lastPage: 563, juz: 29 });
  });
});

describe('next ayah and search', () => {
  it('continues after the last saved ayah, into the next surah once one is finished', () => {
    expect(nextAyah({ surah: 67, ayah: 15 })).toEqual({ surah: 67, ayah: 16 });
    expect(nextAyah({ surah: 67, ayah: 30 })).toEqual({ surah: 68, ayah: 1 });
    expect(nextAyah({ surah: 114, ayah: 6 })).toBeNull();
  });

  it('finds surahs by number, Arabic name (with or without «ال», tashkeel) or English name', () => {
    expect(searchSurahs('')).toHaveLength(114);
    expect(searchSurahs('67')).toEqual([67]);
    expect(searchSurahs('11')).toEqual([11, 110, 111, 112, 113, 114]);
    expect(searchSurahs('الملك')).toEqual([67]);
    expect(searchSurahs('ملك')).toEqual([67]);
    expect(searchSurahs('mulk')).toEqual([67]);
    expect(searchSurahs('القَلَم')).toEqual([68]);
    expect(searchSurahs('zzz')).toEqual([]);
  });
});
