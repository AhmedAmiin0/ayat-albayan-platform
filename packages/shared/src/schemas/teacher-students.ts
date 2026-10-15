import { z } from 'zod';
import type { Program, StudentStatus } from '../enums/index.js';

/** The two separate lists of the teacher's «الطلاب» tab: never one mixed list. */
export const TEACHER_STUDENT_KINDS = ['subscribed', 'trial'] as const;
export type TeacherStudentKind = (typeof TEACHER_STUDENT_KINDS)[number];

/**
 * subscribed = students.status 'active', 'pending_renewal' or 'expired' (owner 2026-10-12: the package
 * ended but lessons keep running, so the teacher keeps the student; the row carries its status for the
 * chip), trial = not subscribed yet (new, trial, pending_subscription; owner 2026-10-15); paused /
 * churned are in neither.
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
export interface TeacherStudentView {
  id: string;
  code: string;
  name: string;
  status: StudentStatus;
  program: Program;
  level: string | null;
  age: number | null;
  /** Start (ISO UTC) of my next scheduled lesson with them, if any. */
  next_lesson_at: string | null;
}
