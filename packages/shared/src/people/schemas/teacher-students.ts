import { z } from 'zod';
import { PROGRAMS, STUDENT_STATUSES, type StudentStatus } from '@ab/catalog';

/** The teacher's students tab keeps two separate lists, never one mixed list. */
export const TEACHER_STUDENT_KINDS = ['subscribed', 'trial'] as const;
export type TeacherStudentKind = (typeof TEACHER_STUDENT_KINDS)[number];

/**
 * subscribed = students.status 'active', 'pending_renewal' or 'expired' (the package ended but
 * lessons keep running, so the teacher keeps the student; the row carries its status for the chip),
 * trial = not subscribed yet (new, trial, pending_subscription); paused / churned are in neither.
 */
export const TEACHER_STUDENT_STATUSES: Record<TeacherStudentKind, readonly StudentStatus[]> = {
  subscribed: ['active', 'pending_renewal', 'expired'],
  trial: ['new', 'trial', 'pending_subscription'],
};

/** GET /teachers/me/students?kind=. */
export const teacherStudentsQuerySchema = z.object({ kind: z.enum(TEACHER_STUDENT_KINDS) });
export type TeacherStudentsQuery = z.output<typeof teacherStudentsQuerySchema>;

/**
 * One of my students. Deliberately nothing else: no phone, guardian or money field ever reaches a
 * teacher (R-TCH-03).
 */
export const teacherStudentViewSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  status: z.enum(STUDENT_STATUSES),
  program: z.enum(PROGRAMS),
  level: z.string().nullable(),
  age: z.number().nullable(),
  /** Start (ISO UTC) of my next scheduled lesson with them, if any. */
  next_lesson_at: z.string().nullable(),
});
export type TeacherStudentView = z.infer<typeof teacherStudentViewSchema>;
