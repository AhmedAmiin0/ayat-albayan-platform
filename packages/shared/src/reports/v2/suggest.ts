import { surahName } from '../quran/quran.js';
import type { ReportContent, SegmentKind } from './content.js';
import { suggestRange, type SurahRange } from './rules.js';

/** The ar.json / en.json strings (reports.v2.suggest), passed in so web, mobile and the API share this. */
export interface SuggestWords {
  homeworkQuran: string;
  nextNew: string;
  nextRevision: string;
  /** reports.v2.suggest.lang: the surah names follow the form's language ('ar' when absent). */
  lang?: string;
}

const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (slot, name: string) => (name in vars ? String(vars[name]) : slot));

const langOf = (words: SuggestWords): 'ar' | 'en' => (words.lang === 'en' ? 'en' : 'ar');

const rangeVars = (r: SurahRange, lang: 'ar' | 'en') => ({ surah: surahName(r.surah, lang), from: r.from, to: r.to });

const lastOf = (content: ReportContent, kind: SegmentKind): SurahRange | null =>
  content.segments.filter((s) => s.kind === kind).at(-1) ?? null;

/**
 * «الواجب» prefill for a Quran lesson: revise today's new memorization (else the last part) daily.
 * Other programs and an empty lesson: null (the teacher writes it).
 */
export function suggestHomework(content: ReportContent, words: SuggestWords, lang = langOf(words)): string | null {
  const range = lastOf(content, 'new') ?? content.segments.at(-1) ?? null;
  return range ? fill(words.homeworkQuran, rangeVars(range, lang)) : null;
}

/**
 * «الحلقة القادمة» prefill: the next new memorization right after today's, and the next revision
 * after today's revision. null when today has neither.
 */
export function suggestNextPlan(content: ReportContent, words: SuggestWords, lang = langOf(words)): string | null {
  const parts: string[] = [];
  const next = suggestRange(lastOf(content, 'new'));
  if (next) parts.push(fill(words.nextNew, rangeVars(next, lang)));
  const revision = suggestRange(lastOf(content, 'revision'));
  if (revision) parts.push(fill(words.nextRevision, rangeVars(revision, lang)));
  return parts.length > 0 ? parts.join(' · ') : null;
}
