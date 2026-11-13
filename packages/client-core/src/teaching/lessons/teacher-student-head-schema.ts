import { STUDENT_STATUSES, type TeacherStudentHead } from '@ab/shared';
import { z } from 'zod';
import { attendanceRowSchema } from './attendance-table-schema.js';

// GET /teachers/me/students/:id (docs/47 PR 1): the student file's head, parsed at the boundary
// (rule 12) on web and mobile. The course carries dates and counts only, never money.

const courseSchema = z.object({
  starts_on: z.string(),
  stopped_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  projected_end_at: z.string().nullable(),
  lessons_total: z.number().int().nonnegative(),
  lessons_used: z.number().int().nonnegative(),
  lessons_remaining: z.number().int().nonnegative(),
});

export const teacherStudentHeadSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  status: z.enum(STUDENT_STATUSES),
  course: courseSchema.nullable(),
  upcoming: z.array(attendanceRowSchema),
}) satisfies z.ZodType<TeacherStudentHead>;
