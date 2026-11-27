import { GENDERS, PROGRAMS, STUDENT_STATUSES } from '@ab/catalog';
import { id } from '@ab/core';
import { z } from 'zod';
import { TEACHER_MEETING_MODES } from '../../classroom/meeting-mode';

/** One of her students: assigned to her or on one of her active rules. */
export const teacherMeStudentSchema = z.object({
  id: id(),
  code: z.string(),
  name: z.string(),
  tz: z.string(),
  status: z.enum(STUDENT_STATUSES),
});

/** GET /teachers/me (R-TCH-03): her own teachers row and students, by name. */
export const teacherMeSchema = z.object({
  id: id(),
  display_name_ar: z.string(),
  gender: z.enum(GENDERS),
  programs: z.array(z.enum(PROGRAMS)),
  tz: z.string(),
  meeting_link: z.string().nullable(),
  /** teachers.meeting_mode as stored: null follows the academy default (migration 490). */
  meeting_mode: z.enum(TEACHER_MEETING_MODES).nullable(),
  /** Whether her lessons use our classroom; absent in an answer cached before migration 490. */
  platform_classroom: z.boolean().optional(),
  students: z.array(teacherMeStudentSchema),
});
export type TeacherMe = z.infer<typeof teacherMeSchema>;
export type TeacherMeInput = z.input<typeof teacherMeSchema>;
