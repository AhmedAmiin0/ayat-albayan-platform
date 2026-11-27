import { ATTENDANCES, LESSON_STATUSES, REPORT_STATUSES } from '@ab/catalog';
import { id, instant } from '@ab/core';
import { monthParam } from '@ab/money';
import { z } from 'zod';
import { attendanceKindSchema } from '../student/student-details';

// One student's past lessons in a month; never a price, payment, meeting link or note.

const count = z.number().int().nonnegative();

/** The row's report state for the teacher: write / edit (inside the window) / view. */
export const attendanceRowReportSchema = z.strictObject({
  status: z.enum(REPORT_STATUSES),
  submitted_at: instant.nullable(),
  sent_at: instant.nullable(),
  can_edit: z.boolean(),
  edit_until: instant.nullable(),
});
export type AttendanceRowReport = z.infer<typeof attendanceRowReportSchema>;

/** `kind` is null when moved; `attendance` null: unmarked. */
export const attendanceTableRowSchema = z.strictObject({
  lesson_id: id(),
  starts_at: instant,
  duration_min: count,
  teacher_name: z.string().nullable(),
  status: z.enum(LESSON_STATUSES),
  attendance: z.enum(ATTENDANCES).nullable(),
  kind: attendanceKindSchema.nullable(),
  /** A report of this student for this lesson was submitted (sent). */
  report_sent: z.boolean(),
  /** That report's id (it opens for any student); else null. */
  report_id: id().nullable(),
  /** Only for a cancelled lesson. */
  cancel_reason: z.string().nullable(),
  is_trial: z.boolean(),
  is_makeup: z.boolean(),
  /** This lesson replaced a moved one. */
  is_rescheduled: z.boolean(),
  /** The start of the lesson it replaced, else its time before an edit (docs/47). */
  moved_from: instant.nullish(),
  moved_to: instant.nullish(),
  /** A one-lesson move's reason (same teacher only). */
  move_reason: z.string().nullish(),
  /** Only the teacher reader's rows carry it (docs/47). */
  report: attendanceRowReportSchema.nullish(),
});
export type AttendanceTableRow = z.infer<typeof attendanceTableRowSchema>;

/** late is part of held; cancelled is per side; rescheduled is moved away. */
export const ATTENDANCE_TOTAL_KINDS = [
  'held',
  'late',
  'absent',
  'excused',
  'cancelled_by_teacher',
  'cancelled_by_admin',
  'rescheduled',
  'unmarked',
] as const;
export const attendanceTotalKindSchema = z.enum(ATTENDANCE_TOTAL_KINDS);
export type AttendanceTotalKind = z.infer<typeof attendanceTotalKindSchema>;

export const studentAttendanceTableSchema = z.strictObject({
  month: monthParam,
  /** Every month with a past lesson, newest first (the current one always). */
  months: z.array(monthParam),
  /** Newest first. */
  items: z.array(attendanceTableRowSchema),
  totals: z.record(attendanceTotalKindSchema, count),
  /** Hers (the sales tree; always true for the admin and the teacher). */
  mine: z.boolean(),
});
export type StudentAttendanceTable = z.infer<typeof studentAttendanceTableSchema>;

/**
 * `?month=YYYY-MM`, the current Riyadh month when absent. The format is judged by the service so a
 * malformed month keeps answering 400 invalid_month.
 */
export const attendanceMonthInput = z.object({ month: z.string().optional() });
export type AttendanceMonthInput = z.infer<typeof attendanceMonthInput>;
