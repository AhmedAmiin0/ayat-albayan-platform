import type { Attendance, Grade, Program } from '@ab/catalog';
import type { ReportView } from '../views.js';
import { emptyContent, MAX_SEGMENTS, type ReportContent, type ReportSegment, type SegmentKind } from './content.js';
import { suggestOverall } from './rules.js';
import { reportV2SubmitSchema, type ReportV2DraftBody, type ReportV2SubmitBody, type V2Problem } from './schema.js';
import { suggestHomework, suggestNextPlan, type SuggestWords } from './suggest.js';

// The v2 «تقرير الحلقة» form state shared by web and mobile (docs/design/report-form): the same
// fields, defaults and checks on both. overall / homework / nextPlan are null until the teacher
// changes them; until then the form shows (and sends) the suggestion.

export interface V2Values {
  attendance: Attendance | null;
  program: Program;
  content: ReportContent;
  overall: Grade | null;
  notes: string;
  homework: string | null;
  nextPlan: string | null;
}

/** A stored value equal to one of the content's suggestions: the teacher never changed it (null). */
const untouched = <T>(stored: T | null, suggestions: readonly (T | null)[]): T | null =>
  stored !== null && suggestions.includes(stored) ? null : stored;

/**
 * A report's v2 values; the program is the report's own, else the student's. A sent report stores
 * the suggestions it showed (in `words`, Arabic first): those read back as untouched, so after an
 * edit the re-sent homework / plan / overall follow the new parts; a typed value stays.
 */
export function v2ValuesOf(report: ReportView, studentProgram: Program, words: readonly SuggestWords[]): V2Values {
  const program = report.program ?? studentProgram;
  const content = report.content ?? emptyContent();
  const quran = program === 'quran' ? words : [];
  return {
    attendance: report.attendance,
    program,
    content,
    overall: untouched(report.grade_overall, [suggestOverall(program, content)]),
    notes: report.notes ?? '',
    homework: untouched(report.homework, quran.map((w) => suggestHomework(content, w))),
    nextPlan: untouched(report.next_plan, quran.map((w) => suggestNextPlan(content, w))),
  };
}

/** What the form shows and sends for the three prefilled fields. */
export function effective(v: V2Values, words: SuggestWords): { overall: Grade | null; homework: string; nextPlan: string } {
  const quran = v.program === 'quran';
  return {
    overall: v.overall ?? suggestOverall(v.program, v.content),
    homework: v.homework ?? (quran ? suggestHomework(v.content, words) : null) ?? '',
    nextPlan: v.nextPlan ?? (quran ? suggestNextPlan(v.content, words) : null) ?? '',
  };
}

/** Autosave: the whole form as the teacher left it (the suggestions are not saved until sent). */
export function v2DraftBody(v: V2Values): ReportV2DraftBody {
  return {
    attendance: v.attendance,
    program: v.program,
    content: v.content,
    overall: v.overall,
    notes: v.notes,
    ...(v.homework === null ? {} : { homework: v.homework }),
    ...(v.nextPlan === null ? {} : { nextPlan: v.nextPlan }),
  };
}

/**
 * Submit: the form with the overall grade it shows. Homework and the next plan go only when the
 * teacher changed them; untouched, the API stores the same suggestion in Arabic (the family
 * report is Arabic, whatever the teacher's language).
 */
export function v2SubmitBody(v: V2Values, opts: { version: number; words: SuggestWords }): ReportV2SubmitBody {
  const { overall } = effective(v, opts.words);
  return { ...v2DraftBody(v), overall, program: v.program, expectedVersion: opts.version };
}

/** The API's own check before sending (null = it would pass). */
export function v2Problem(v: V2Values, opts: { version: number; words: SuggestWords }): V2Problem | 'invalid_range' | 'too_many_segments' | null {
  const r = reportV2SubmitSchema.safeParse(v2SubmitBody(v, opts));
  return r.success ? null : ((r.error.issues[0]?.message as V2Problem | 'invalid_range' | 'too_many_segments' | undefined) ?? 'missing_grades');
}

/** The segments of one track, with their index in content.segments (for updates). */
export function segmentsOf(content: ReportContent, kind: SegmentKind): { segment: ReportSegment; index: number }[] {
  return content.segments.flatMap((segment, index) => (segment.kind === kind ? [{ segment, index }] : []));
}

/** Replace, add (index = -1) or remove (segment = null) one part; an add to a full form (MAX_SEGMENTS) is refused. */
export function withSegment(content: ReportContent, change: { index: number; segment: ReportSegment | null }): ReportContent {
  const { index, segment } = change;
  if (index < 0) return segment && content.segments.length < MAX_SEGMENTS ? { ...content, segments: [...content.segments, segment] } : content;
  const segments = segment
    ? content.segments.map((s, i) => (i === index ? segment : s))
    : content.segments.filter((_, i) => i !== index);
  return { ...content, segments };
}
