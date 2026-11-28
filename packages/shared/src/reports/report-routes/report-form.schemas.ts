import { LESSON_STATUSES, PROGRAMS } from '@ab/catalog';
import { balanceViewSchema } from '@ab/money';
import { z } from 'zod';
import { SEGMENT_KINDS } from '../v2/content';
import { reportViewSchema } from './report-view.schemas';

/** A saved surah range. */
export const surahRangeSchema = z.object({
  surah: z.int(),
  from: z.int(),
  to: z.int(),
});

/** Per track, the last range in a submitted v2 report and the surahs used lately. */
export const memoryViewSchema = z.object({
  last: z.record(z.enum(SEGMENT_KINDS), surahRangeSchema.nullable()),
  recent_surahs: z.array(z.int()),
});

export const reportBlockSchema = z.enum(['lesson_cancelled', 'not_started']);

/** Read-only identity the form shows (R-REP-01): never typed, taken from the lesson. */
export const reportFormLessonSchema = z.object({
  id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  status: z.enum(LESSON_STATUSES),
  meeting_link: z.string().nullable(),
  teacher: z.object({
    id: z.string(),
    display_name_ar: z.string(),
    display_name_en: z.string().nullish(),
    tz: z.string(),
  }),
});

export const reportFormEntrySchema = z.object({
  student: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    tz: z.string(),
    program: z.enum(PROGRAMS),
  }),
  /** R-LES-03, issue A5: v_lesson_sequence.seq once completed, else prior completed lessons + 1. */
  lesson_no: z.int(),
  /** The package the lesson counts against (v_subscription_balance), null without one. */
  package: balanceViewSchema.nullable(),
  report: reportViewSchema,
  /** v2 reports only: the last saved range per track, read from the student's v2 reports. */
  memory: memoryViewSchema.nullish(),
});

/** One entry per student on the lesson (group lessons, R-STU-04). */
export const reportFormResponseSchema = z.object({
  lesson: reportFormLessonSchema,
  entries: z.array(reportFormEntrySchema),
  /** reportBlock(...) for a submit now; drafts can always be saved. */
  submit_block: reportBlockSchema.nullable(),
});

export type ReportBlock = z.infer<typeof reportBlockSchema>;
export type SurahRange = z.infer<typeof surahRangeSchema>;
export type MemoryView = z.infer<typeof memoryViewSchema>;
export type ReportFormLesson = z.infer<typeof reportFormLessonSchema>;
export type ReportFormEntry = z.infer<typeof reportFormEntrySchema>;
export type ReportFormResponse = z.infer<typeof reportFormResponseSchema>;
