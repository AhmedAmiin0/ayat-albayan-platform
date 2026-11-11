import { ATTENDANCES, LESSON_STATUSES, type StudentAttendanceTable } from '@ab/shared';
import { z } from 'zod';

// GET /teachers/me/students/:id/attendance (docs/46 C5): the sales «سجل الحضور» table, parsed at
// the boundary (rule 12) on web and mobile before their tables read it.

const KINDS = ['present', 'absent', 'excused', 'cancelled', 'unmarked'] as const;
const count = z.number().int().nonnegative();

const rowSchema = z.object({
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
});

export const attendanceTableSchema = z.object({
  month: z.string(),
  months: z.array(z.string()),
  items: z.array(rowSchema),
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
