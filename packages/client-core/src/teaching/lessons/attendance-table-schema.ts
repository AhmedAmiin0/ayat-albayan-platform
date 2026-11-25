import type { StudentAttendanceTable } from '@ab/shared';
import { ATTENDANCES, LESSON_STATUSES, REPORT_STATUSES } from '@ab/catalog';
import { z } from 'zod';

// Parsed at the boundary (rule 12, docs/46 C5); docs/47 fields are nullish for an old API.

const KINDS = ['present', 'absent', 'excused', 'cancelled', 'unmarked'] as const;
const count = z.number().int().nonnegative();

const rowReportSchema = z.object({
  status: z.enum(REPORT_STATUSES),
  submitted_at: z.string().nullable(),
  sent_at: z.string().nullable(),
  can_edit: z.boolean(),
  edit_until: z.string().nullable(),
});

export const attendanceRowSchema = z.object({
  lesson_id: z.string(),
  starts_at: z.string(),
  duration_min: z.number(),
  teacher_name: z.string().nullable(),
  status: z.enum(LESSON_STATUSES),
  attendance: z.enum(ATTENDANCES).nullable(),
  kind: z.enum(KINDS).nullable(),
  report_sent: z.boolean(),
  report_id: z.string().nullable(),
  cancel_reason: z.string().nullable(),
  is_trial: z.boolean(),
  is_makeup: z.boolean(),
  is_rescheduled: z.boolean(),
  moved_from: z.string().nullish(),
  moved_to: z.string().nullish(),
  move_reason: z.string().nullish(),
  report: rowReportSchema.nullish(),
});

export const attendanceTableSchema = z.object({
  month: z.string(),
  months: z.array(z.string()),
  items: z.array(attendanceRowSchema),
  totals: z.object({
    held: count,
    late: count,
    absent: count,
    excused: count,
    cancelled_by_teacher: count,
    cancelled_by_admin: count,
    rescheduled: count,
    unmarked: count,
  }),
  mine: z.boolean(),
}) satisfies z.ZodType<StudentAttendanceTable>;
