import { z } from 'zod';
import { ATTENDANCES, GRADES, PROGRAMS, type Program } from '../../enums/index.js';
import { attended } from '../rules.js';
import { ARABIC_SKILLS, ISLAMIC_RATES, reportContentSchema, type ReportContent } from './content.js';

// v2 report commands (PUT /reports/:id/v2/draft, POST /reports/:id/v2/submit). camelCase like the
// v1 commands; the identity is never sent (R-REP-01). Notes, homework and the next plan keep the
// v1 columns, the rest lives in `content`.

const longText = z
  .string()
  .trim()
  .max(4000)
  .transform((v) => (v === '' ? null : v))
  .nullish();

/** Autosave: every field optional; only the fields sent are written. */
export const reportV2DraftSchema = z.object({
  attendance: z.enum(ATTENDANCES).nullish(),
  program: z.enum(PROGRAMS).optional(),
  content: reportContentSchema.optional(),
  overall: z.enum(GRADES).nullish(),
  notes: longText,
  homework: longText,
  nextPlan: longText,
});

export type V2Problem = 'missing_attendance' | 'missing_segments' | 'missing_topic' | 'missing_domain' | 'missing_grades';

const allGraded = (grades: Record<string, unknown>, keys: readonly string[]) => keys.every((k) => grades[k] != null);

const quranProblem = (c: ReportContent): V2Problem | null => {
  if (c.segments.length === 0) return 'missing_segments';
  return c.segments.every((s) => s.grade !== null) ? null : 'missing_grades';
};

const arabicProblem = (c: ReportContent): V2Problem | null => {
  if (!c.arabic?.topic) return 'missing_topic';
  return allGraded(c.arabic.skills, ARABIC_SKILLS) ? null : 'missing_grades';
};

const islamicProblem = (c: ReportContent): V2Problem | null => {
  if (!c.islamic?.domain) return 'missing_domain';
  if (!c.islamic.topic) return 'missing_topic';
  return allGraded(c.islamic.rates, ISLAMIC_RATES) ? null : 'missing_grades';
};

const PROBLEM_OF: Record<Program, (c: ReportContent) => V2Problem | null> = {
  quran: quranProblem,
  arabic: arabicProblem,
  islamic_studies: islamicProblem,
};

/** What a program's content still lacks for a send (null = complete). Grades come last, as on the form. */
export function contentProblem(program: Program, content: ReportContent): V2Problem | null {
  return PROBLEM_OF[program](content);
}

/**
 * Submit: the whole form. Attendance and program are required; when the student attended, the
 * program's content (contentProblem) and the overall grade too. Absent / excused: nothing else.
 */
export const reportV2SubmitSchema = reportV2DraftSchema
  .extend({ expectedVersion: z.int().min(0), program: z.enum(PROGRAMS), content: reportContentSchema.prefault({}) })
  .superRefine((r, ctx) => {
    if (!r.attendance) {
      ctx.addIssue({ code: 'custom', path: ['attendance'], message: 'missing_attendance' });
      return;
    }
    if (!attended(r.attendance)) return;
    const problem = contentProblem(r.program, r.content) ?? (r.overall ? null : 'missing_grades');
    if (problem) ctx.addIssue({ code: 'custom', path: ['content'], message: problem });
  });

export type ReportV2Draft = z.output<typeof reportV2DraftSchema>;
export type ReportV2Submit = z.output<typeof reportV2SubmitSchema>;
/** What a client sends. */
export type ReportV2DraftBody = z.input<typeof reportV2DraftSchema>;
export type ReportV2SubmitBody = z.input<typeof reportV2SubmitSchema>;
