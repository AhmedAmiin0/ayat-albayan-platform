import { GRADES, type Attendance, type Grade, type Program } from '../../enums/index.js';
import { ayahCount, nextAyah } from '../quran/quran.js';
import { attended } from '../rules.js';
import {
  ARABIC_SKILLS,
  emptyContent,
  ISLAMIC_RATES,
  SEGMENT_KINDS,
  type ReportContent,
  type ReportSegment,
  type SegmentKind,
} from './content.js';

/** A saved surah range. */
export interface SurahRange {
  surah: number;
  from: number;
  to: number;
}

/**
 * The teacher's memorization history for one student (GET report-form, v2 entries): per track the
 * last range saved in a submitted v2 report, and the surahs used lately (the picker's «الأخيرة»).
 */
export interface MemoryView {
  last: Record<SegmentKind, SurahRange | null>;
  recent_surahs: number[];
}

const RECENT = 4;

/** History (submitted v2 contents, newest first) → MemoryView. Old (v1) reports are never read. */
export function memoryOf(contents: readonly ReportContent[]): MemoryView {
  const last = Object.fromEntries(SEGMENT_KINDS.map((k) => [k, null])) as MemoryView['last'];
  const recent: number[] = [];
  for (const content of contents) {
    for (const kind of SEGMENT_KINDS) {
      const mine = content.segments.filter((s) => s.kind === kind);
      const seg = mine[mine.length - 1];
      if (seg && last[kind] === null) last[kind] = { surah: seg.surah, from: seg.from, to: seg.to };
    }
    for (const s of content.segments) if (!recent.includes(s.surah) && recent.length < RECENT) recent.push(s.surah);
  }
  return { last, recent_surahs: recent };
}

/**
 * Where the picker opens for a track: right after the last saved ayah, as long as the last range
 * (capped at the surah's end). No history: null (the teacher picks the surah).
 */
export function suggestRange(last: SurahRange | null): SurahRange | null {
  if (!last) return null;
  const start = nextAyah({ surah: last.surah, ayah: last.to });
  if (!start) return null;
  const length = last.to - last.from + 1;
  return { surah: start.surah, from: start.ayah, to: Math.min(ayahCount(start.surah), start.ayah + length - 1) };
}

/** The grades a program's content carries, in form order. */
export function contentGrades(program: Program, content: ReportContent): (Grade | null)[] {
  if (program === 'quran') return content.segments.map((s) => s.grade);
  if (program === 'arabic') return ARABIC_SKILLS.map((k) => content.arabic?.skills[k] ?? null);
  return ISLAMIC_RATES.map((k) => content.islamic?.rates[k] ?? null);
}

/** «مقترح من التقييمات»: the rounded mean of the graded rows (ممتاز = 0 … يحتاج إلى مراجعة = 4). */
export function suggestOverall(program: Program, content: ReportContent): Grade | null {
  const idx = contentGrades(program, content)
    .filter((g): g is Grade => g !== null)
    .map((g) => GRADES.indexOf(g));
  if (idx.length === 0) return null;
  return GRADES[Math.round(idx.reduce((a, b) => a + b, 0) / idx.length)] ?? null;
}

/**
 * What a send stores: attended → only the taught program's part (the others are hidden on the
 * form); absent or excused → no content at all (the form hides every content section).
 */
export function keptContent(attendance: Attendance, program: Program, content: ReportContent): ReportContent {
  const empty = emptyContent();
  if (!attended(attendance)) return empty;
  if (program === 'quran') return { ...empty, segments: content.segments, tajweed: content.tajweed, quick: content.quick };
  if (program === 'arabic') return { ...empty, arabic: content.arabic, quick: content.quick };
  return { ...empty, islamic: content.islamic, quick: content.quick };
}

const firstOf = (segments: readonly ReportSegment[], kind: SegmentKind) =>
  segments.find((s) => s.kind === kind)?.grade ?? null;

/**
 * The v1 grade columns a v2 report still fills, so the history chart and lists read it: each
 * track's first part → recitation / memorization / revision. The other rubrics stay null.
 */
export function legacyGrades(content: ReportContent) {
  return {
    grade_recitation: firstOf(content.segments, 'recited'),
    grade_memorization: firstOf(content.segments, 'new'),
    grade_revision: firstOf(content.segments, 'revision'),
  };
}
