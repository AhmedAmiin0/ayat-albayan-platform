import { z } from 'zod';
import { ATTENDANCES, GRADES, PROGRAMS } from '@ab/catalog';
import { REPORT_RUBRICS, type Rubric } from './rules.js';
import { reportContentSchema } from './v2/content.js';

// The report's live page (owner 2026-11-06): https://app.ayatalbayan.com/report/<public_id>, read
// from the SAVED report (never the PDF), with the teacher's files and the PDF download.

/** lesson_reports.public_id: 32 hex characters (migration 20261106000900). */
export const reportPublicIdSchema = z.string().regex(/^[0-9a-f]{32}$/);

const text = z.string().nullable();
const grade = z.enum(GRADES).nullable();
const gradesShape = Object.fromEntries(REPORT_RUBRICS.map((r) => [r, grade])) as Record<
  Rubric,
  typeof grade
>;

/** The saved report as the page shows it: the form's answers only (no PDF error, no paths). */
export const reportPageReportSchema = z.object({
  form_version: z.union([z.literal(1), z.literal(2)]),
  attendance: z.enum(ATTENDANCES).nullable(),
  program: z.enum(PROGRAMS).nullable(),
  recited: text,
  new_memorization: text,
  revision: text,
  theory: text,
  grades: z.object(gradesShape),
  grade_overall: grade,
  notes: text,
  homework: text,
  next_plan: text,
  content: reportContentSchema.nullable(),
  version: z.number().int(),
  submitted_at: text,
  edited_at: text,
});

/** One teacher file: a 1 h signed URL, never its storage path. */
export const reportPageFileSchema = z.object({
  id: z.uuid(),
  mime: z.string(),
  size: z.number().int(),
  url: z.url(),
});

/** GET /report-pages/:publicId (signed in) and, with a code, the public page. */
export const reportPageViewSchema = z.object({
  public_id: reportPublicIdSchema,
  student: z.object({ name: z.string() }),
  teacher: z.object({ name: z.string() }),
  lesson: z.object({ starts_at: z.string(), ends_at: z.string() }),
  /** The student's zone: the lesson's date and time as the family reads them. */
  tz: z.string(),
  report: reportPageReportSchema,
  attachments: z.array(reportPageFileSchema),
  /** A 1 h signed URL to the PDF; null while it is still being generated. */
  pdf: z.object({ url: z.url() }).nullable(),
});

export type ReportPageReport = z.infer<typeof reportPageReportSchema>;
export type ReportPageFile = z.infer<typeof reportPageFileSchema>;
export type ReportPageView = z.infer<typeof reportPageViewSchema>;
