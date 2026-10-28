import type { Attendance, Grade, Program } from '../../enums/index.js';
import type { ReportView } from '../views.js';
import { emptyContent, type ReportContent, type ReportSegment, type SegmentKind } from './content.js';
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

/** A report's v2 values; the program is the report's own, else the student's. */
export function v2ValuesOf(report: ReportView, studentProgram: Program): V2Values {
  return {
    attendance: report.attendance,
    program: report.program ?? studentProgram,
    content: report.content ?? emptyContent(),
    overall: report.grade_overall,
    notes: report.notes ?? '',
    homework: report.homework,
    nextPlan: report.next_plan,
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

/** Submit: the form with the suggestions it shows. */
export function v2SubmitBody(v: V2Values, opts: { version: number; words: SuggestWords }): ReportV2SubmitBody {
  const e = effective(v, opts.words);
  return { ...v2DraftBody(v), ...e, program: v.program, expectedVersion: opts.version };
}

/** The API's own check before sending (null = it would pass). */
export function v2Problem(v: V2Values, opts: { version: number; words: SuggestWords }): V2Problem | 'invalid_range' | null {
  const r = reportV2SubmitSchema.safeParse(v2SubmitBody(v, opts));
  return r.success ? null : ((r.error.issues[0]?.message as V2Problem | 'invalid_range' | undefined) ?? 'missing_grades');
}

/** The segments of one track, with their index in content.segments (for updates). */
export function segmentsOf(content: ReportContent, kind: SegmentKind): { segment: ReportSegment; index: number }[] {
  return content.segments.flatMap((segment, index) => (segment.kind === kind ? [{ segment, index }] : []));
}

/** Replace, add (index = -1) or remove (segment = null) one part. */
export function withSegment(content: ReportContent, change: { index: number; segment: ReportSegment | null }): ReportContent {
  const { index, segment } = change;
  if (index < 0) return segment ? { ...content, segments: [...content.segments, segment] } : content;
  const segments = segment
    ? content.segments.map((s, i) => (i === index ? segment : s))
    : content.segments.filter((_, i) => i !== index);
  return { ...content, segments };
}
