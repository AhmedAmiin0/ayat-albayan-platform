import { JUZ_COUNT, PAGE_COUNT, globalAyah, juzOf, juzPages } from '../quran/quran.js';
import { PAGE_STARTS } from '../quran/quran-data.js';
import type { ReportContent } from './content.js';
import type { SurahRange } from './rules.js';

/** «التقدّم في الحفظ» on the family report: pages of the current juz held, and the juz completed. */
export interface JuzProgress {
  juz: number;
  done: number;
  total: number;
  /** Every juz whose pages are all held, ascending. */
  completed: number[];
}

const TOTAL_AYAHS = 6236;

/** Global positions held: every range the student recited, memorised or revised in a v2 report. */
function heldPositions(ranges: readonly SurahRange[]): Set<number> {
  const held = new Set<number>();
  for (const r of ranges) {
    const end = globalAyah({ surah: r.surah, ayah: r.to });
    for (let p = globalAyah({ surah: r.surah, ayah: r.from }); p <= end; p += 1) held.add(p);
  }
  return held;
}

/** Is every ayah of the page held? */
function pageHeld(page: number, held: ReadonlySet<number>): boolean {
  const first = PAGE_STARTS[page - 1] ?? 1;
  const last = page < PAGE_COUNT ? (PAGE_STARTS[page] ?? TOTAL_AYAHS + 1) - 1 : TOTAL_AYAHS;
  for (let p = first; p <= last; p += 1) if (!held.has(p)) return false;
  return true;
}

function pagesHeld(juz: number, held: ReadonlySet<number>): { done: number; total: number } {
  const { first, last, count } = juzPages(juz);
  let done = 0;
  for (let page = first; page <= last; page += 1) if (pageHeld(page, held)) done += 1;
  return { done, total: count };
}

/**
 * Progress in the juz of this lesson's new memorization (else its first part), counted in whole
 * pages over the student's v2 history (this report included). null when the lesson has no part.
 * Only v2 reports are read, so memorization before the new form is not counted.
 */
export function juzProgress(today: ReportContent, history: readonly SurahRange[]): JuzProgress | null {
  const anchor = today.segments.find((s) => s.kind === 'new') ?? today.segments[0];
  if (!anchor) return null;
  const held = heldPositions([...history, ...today.segments]);
  const juz = juzOf({ surah: anchor.surah, ayah: anchor.from });
  const completed = Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).filter((j) => {
    const { done, total } = pagesHeld(j, held);
    return done === total;
  });
  return { juz, ...pagesHeld(juz, held), completed };
}
