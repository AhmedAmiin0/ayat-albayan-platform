import { z } from 'zod';
import type { Program, StudentStatus } from '../enums/index.js';

/** The two separate lists of the teacher's «الطلاب» tab: never one mixed list. */
export const TEACHER_STUDENT_KINDS = ['subscribed', 'trial'] as const;
export type TeacherStudentKind = (typeof TEACHER_STUDENT_KINDS)[number];

/** subscribed = students.status 'active', trial = 'trial'; paused / churned are in neither. */
export const TEACHER_STUDENT_STATUS: Record<TeacherStudentKind, StudentStatus> = {
  subscribed: 'active',
  trial: 'trial',
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
