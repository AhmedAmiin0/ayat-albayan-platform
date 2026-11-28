import { rangeInfo, surahName, type SurahRange } from '@ab/shared';
import { counted, type Locale, type PluralForm } from '@ab/core';

// Each app injects its `t.reports.v2`, read per call.

/** The part of the app's `t.reports.v2` read here. */
export interface RangeWords {
  rangeValue: string;
  ayahs: Readonly<Record<PluralForm, string>>;
  pageOne: string;
  pageRange: string;
}

/** `{name}` slots filled from vars; an unknown slot stays as written. */
export function fillSlots(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (slot, name: string) =>
    name in vars ? String(vars[name]) : slot,
  );
}

export function rangeLabel(
  range: SurahRange,
  opts: { words: Pick<RangeWords, 'rangeValue'>; lang: Locale },
): string {
  return fillSlots(opts.words.rangeValue, {
    surah: surahName(range.surah, opts.lang),
    from: range.from,
    to: range.to,
  });
}

/** «562» or «562–563»: the range's pages. */
export function rangePages(range: SurahRange): string {
  const { firstPage, lastPage } = rangeInfo(range);
  return firstPage === lastPage ? String(firstPage) : `${firstPage}–${lastPage}`;
}

export function rangeMeta(range: SurahRange, words: RangeWords): string {
  const { ayahs, firstPage, lastPage } = rangeInfo(range);
  const page =
    firstPage === lastPage
      ? fillSlots(words.pageOne, { page: firstPage })
      : fillSlots(words.pageRange, { first: firstPage, last: lastPage });
  return `${counted(words.ayahs, ayahs)} · ${page}`;
}

export function rangeSummary(
  range: SurahRange,
  words: { ayahs: RangeWords['ayahs']; summary: string },
): string {
  const info = rangeInfo(range);
  return fillSlots(words.summary, {
    ayahs: counted(words.ayahs, info.ayahs),
    page: rangePages(range),
    juz: info.juz,
  });
}
