import { z } from 'zod';
import { ATTENDANCES, GRADES } from '@ab/catalog';
import { listSortShape } from '@ab/core';

// GET /teachers/me/reports sort and column filters (teacher mode «تقارير أُرسلت», R-REP-02, R-NFR-08).

/** No `sort` = newest submit first. The lesson date has no sort: lesson_reports has no FK to lessons. */
export const TEACHER_REPORT_SORT_KEYS = ['submitted', 'attendance', 'grade'] as const;
export type TeacherReportSortKey = (typeof TEACHER_REPORT_SORT_KEYS)[number];

/** `student` matches the name or the code («contains»); attendance and grade are exact. */
export const TEACHER_REPORT_FILTER_KEYS = ['student', 'attendance', 'grade'] as const;

export const teacherReportsQuerySchema = z.object({
  student: z.string().trim().min(1).max(100).optional(),
  attendance: z.enum(ATTENDANCES).optional(),
  grade: z.enum(GRADES).optional(),
  ...listSortShape(TEACHER_REPORT_SORT_KEYS),
});
export type TeacherReportsQuery = z.output<typeof teacherReportsQuerySchema>;
