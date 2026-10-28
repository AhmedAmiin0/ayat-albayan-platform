import { counted, rangeInfo, surahName, type Locale, type PluralForm, type SurahRange } from '@ab/shared';

// The v2 report's range sentences («سورة الملك · الآيات 1–15», «15 آية · ص 562–563»), shared by
// the web and mobile forms and the admin views. Each app injects its `t.reports.v2` (read per call).

/** The part of the app's `t.reports.v2` read here. */
export interface RangeWords {
  rangeValue: string;
  ayahs: Readonly<Record<PluralForm, string>>;
  pageOne: string;
  pageRange: string;
}

/** `{name}` slots filled from vars; an unknown slot stays as written. */
export function fillSlots(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, name: string) => (name in vars ? String(vars[name]) : slot));
}

/** «سورة الملك · الآيات 1–15» in the UI language. */
export function rangeLabel(range: SurahRange, opts: { words: Pick<RangeWords, 'rangeValue'>; lang: Locale }): string {
  return fillSlots(opts.words.rangeValue, { surah: surahName(range.surah, opts.lang), from: range.from, to: range.to });
}

/** «562» or «562–563»: the range's pages. */
export function rangePages(range: SurahRange): string {
  const { firstPage, lastPage } = rangeInfo(range);
  return firstPage === lastPage ? String(firstPage) : `${firstPage}–${lastPage}`;
}

/** «15 آية · ص 562–563»: the meta line of a part on the form. */
export function rangeMeta(range: SurahRange, words: RangeWords): string {
  const { ayahs, firstPage, lastPage } = rangeInfo(range);
  const page =
    firstPage === lastPage
      ? fillSlots(words.pageOne, { page: firstPage })
      : fillSlots(words.pageRange, { first: firstPage, last: lastPage });
  return `${counted(words.ayahs, ayahs)} · ${page}`;
}

/** The picker's line: «7 آيات · الصفحة 563 · الجزء 29.» */
export function rangeSummary(range: SurahRange, words: { ayahs: RangeWords['ayahs']; summary: string }): string {
  const info = rangeInfo(range);
  return fillSlots(words.summary, { ayahs: counted(words.ayahs, info.ayahs), page: rangePages(range), juz: info.juz });
}
