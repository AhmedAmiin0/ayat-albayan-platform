import { normalizeArabic } from '@ab/core';
import { JUZ_STARTS, PAGE_STARTS, SURAHS } from './quran-data.js';

// Lookups over the mushaf metadata (quran-data.ts): the v2 lesson report's surah/ayah picker,
// its page and juz hints, and the family report's juz progress (owner 2026-10-26).

export const SURAH_COUNT = 114;
export const PAGE_COUNT = 604;
export const JUZ_COUNT = 30;

/** A place in the mushaf: surah 1–114, ayah 1–its count. */
export interface AyahRef {
  surah: number;
  ayah: number;
}

/** Ayahs before each surah: OFFSETS[s - 1] + ayah = the global position. */
const OFFSETS = SURAHS.reduce<number[]>((acc, s, i) => [...acc, (acc[i] ?? 0) + s[2]], [0]);

export const isSurah = (surah: number): boolean => Number.isInteger(surah) && surah >= 1 && surah <= SURAH_COUNT;

/** Ayah count of a surah; 0 when the number is not a surah. */
export function ayahCount(surah: number): number {
  return isSurah(surah) ? (SURAHS[surah - 1]?.[2] ?? 0) : 0;
}

export function isAyah(ref: AyahRef): boolean {
  return Number.isInteger(ref.ayah) && ref.ayah >= 1 && ref.ayah <= ayahCount(ref.surah);
}

/** «الملك» (ar) or «Al-Mulk» (en); '' when the number is not a surah. */
export function surahName(surah: number, lang: 'ar' | 'en' = 'ar'): string {
  const row = isSurah(surah) ? SURAHS[surah - 1] : undefined;
  return row ? row[lang === 'ar' ? 0 : 1] : '';
}

/** 1 = الفاتحة 1 … 6236 = الناس 6. Throws on a place that is not in the mushaf. */
export function globalAyah(ref: AyahRef): number {
  if (!isAyah(ref)) throw new RangeError(`not an ayah: ${ref.surah}:${ref.ayah}`);
  return (OFFSETS[ref.surah - 1] ?? 0) + ref.ayah;
}

/** Index of the last start ≤ position (starts ascending, starts[0] = 1). */
function lastStartAtOrBefore(starts: readonly number[], position: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if ((starts[mid] ?? Infinity) <= position) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Mushaf page (1–604) of an ayah. */
export const pageOf = (ref: AyahRef): number => lastStartAtOrBefore(PAGE_STARTS, globalAyah(ref)) + 1;

/** Juz (1–30) of an ayah. */
export const juzOf = (ref: AyahRef): number => lastStartAtOrBefore(JUZ_STARTS, globalAyah(ref)) + 1;

/** First and last page of a juz (juz 29: 562–581). */
export function juzPages(juz: number): { first: number; last: number; count: number } {
  const start = JUZ_STARTS[juz - 1];
  if (start === undefined) throw new RangeError(`not a juz: ${juz}`);
  const next = JUZ_STARTS[juz];
  const first = lastStartAtOrBefore(PAGE_STARTS, start) + 1;
  const last = next === undefined ? PAGE_COUNT : lastStartAtOrBefore(PAGE_STARTS, next - 1) + 1;
  return { first, last, count: last - first + 1 };
}

/** A surah range on the form: «7 آيات · ص 563 · ج 29». */
export interface RangeInfo {
  ayahs: number;
  firstPage: number;
  lastPage: number;
  juz: number;
}

export function rangeInfo(range: { surah: number; from: number; to: number }): RangeInfo {
  const first = { surah: range.surah, ayah: range.from };
  return {
    ayahs: range.to - range.from + 1,
    firstPage: pageOf(first),
    lastPage: pageOf({ surah: range.surah, ayah: range.to }),
    juz: juzOf(first),
  };
}

/**
 * Where the next lesson starts after the last saved ayah: the next ayah of the same surah, or
 * ayah 1 of the next surah once it is finished; null after الناس 6.
 */
export function nextAyah(last: AyahRef): AyahRef | null {
  if (last.ayah < ayahCount(last.surah)) return { surah: last.surah, ayah: last.ayah + 1 };
  return last.surah < SURAH_COUNT ? { surah: last.surah + 1, ayah: 1 } : null;
}

/** Surah numbers matching a search: its number, or its Arabic / English name (tashkeel and «ال» ignored). */
export function searchSurahs(query: string): number[] {
  const q = query.trim();
  const all = Array.from({ length: SURAH_COUNT }, (_, i) => i + 1);
  if (q === '') return all;
  if (/^\d+$/.test(q)) return all.filter((n) => String(n).startsWith(q));
  const bare = (s: string) => normalizeArabic(s).replace(/^ال/, '').replace(/[^\p{L}\p{N}]/gu, '');
  const needle = bare(q);
  return all.filter((n) => bare(surahName(n)).includes(needle) || bare(surahName(n, 'en')).includes(needle));
}
