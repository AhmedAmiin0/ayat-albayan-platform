import { ATTENDANCES, GRADES, LESSON_STATUSES, PDF_STATUSES, REPORT_STATUSES } from '@ab/catalog';
import { pageOf } from '@ab/core';
import { z } from 'zod';
import { REPORT_RUBRICS } from '../rules';

const instant = z.string().nullable();
const score = z.number().nullable();

/** A missing student embed reads as '' rather than failing the whole list. */
const reportStudentSchema = z.object({ id: z.string(), code: z.string(), name: z.string() });

const sendState = {
  attendance: z.enum(ATTENDANCES).nullable(),
  grade_overall: z.enum(GRADES).nullable(),
  status: z.enum(REPORT_STATUSES),
  pdf_status: z.enum(PDF_STATUSES).nullable(),
  sent_at: instant,
};

/** One progress-chart point (R-REP-05): gradeScore per rubric, 5 = excellent ... 1. */
export const gradePointSchema = z.object({
  report_id: z.string(),
  lesson_id: z.string(),
  starts_at: z.string(),
  overall: score,
  rubrics: z.record(z.enum(REPORT_RUBRICS), score),
});

/** History row: the report plus its lesson's time and number. */
export const reportSummaryViewSchema = z.object({
  id: z.string(),
  lesson_id: z.string(),
  starts_at: z.string(),
  lesson_no: z.int().nullable(),
  teacher: z.object({ id: z.string(), display_name_ar: z.string() }),
  ...sendState,
  version: z.int().min(0),
  /**
   * docs/46 B7: the first submit, and for the reader can_edit (canEditReport) and edit_until
   * (first submit + report_teacher_edit_minutes). Sales get none.
   */
  submitted_at: instant.optional(),
  can_edit: z.boolean().optional(),
  edit_until: instant.optional(),
});

/** R-REP-05, issue D2: submitted reports newest first, and the series oldest first, all of it. */
export const studentReportsResponseSchema = pageOf(reportSummaryViewSchema).extend({
  series: z.array(gradePointSchema),
});

/** R-TCH-03: a started lesson still missing a submitted report. */
export const pendingReportViewSchema = z.object({
  lesson_id: z.string(),
  starts_at: z.string(),
  status: z.enum(LESSON_STATUSES),
  student: reportStudentSchema,
  report_id: z.string().nullable(),
});

/** R-REP-02: one of my submitted reports, with my edit window now (canEditReport, editUntil). */
export const teacherReportViewSchema = z.object({
  id: z.string(),
  lesson_id: z.string(),
  starts_at: z.string(),
  student: reportStudentSchema,
  ...sendState,
  submitted_at: instant,
  can_edit: z.boolean(),
  edit_until: instant,
});

export type GradePoint = z.infer<typeof gradePointSchema>;
export type ReportSummaryView = z.infer<typeof reportSummaryViewSchema>;
export type StudentReportsResponse = z.infer<typeof studentReportsResponseSchema>;
export type PendingReportView = z.infer<typeof pendingReportViewSchema>;
export type TeacherReportView = z.infer<typeof teacherReportViewSchema>;
