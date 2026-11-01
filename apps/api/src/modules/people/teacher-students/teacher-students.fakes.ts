// Test fixtures for the teacher-students tests (not shipped; excluded from the build by *.fakes.ts).
import type { AuthUser } from '@/common/auth/verify-token';
import type { TeacherLessonRow, TeacherStudentRow } from './teacher-students.repo';

export const TEACHER: AuthUser = { id: 'b0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' };
export const OTHER: AuthUser = { id: 'b0000000-0000-4000-8000-000000000003', email: null, role: 'teacher' };
export const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };
export const GUARDIAN: AuthUser = { id: 'c0000000-0000-4000-8000-000000000004', email: null, role: 'guardian' };
export const TEACHER_ID = 'teacher-1';
export const OTHER_ID = 'teacher-2';

export const student = (over: Partial<TeacherStudentRow>): TeacherStudentRow => ({
  ...{ id: 's1', code: 'AB-0001', name: 'سهيلة', status: 'active', program: 'quran', level: null, age: 9 },
  ...over,
});

export const lesson = (over: Partial<TeacherLessonRow> & { students?: string[] }): TeacherLessonRow => ({
  starts_at: '2026-10-05T14:00:00+00:00',
  status: 'scheduled',
  lesson_students: (over.students ?? ['s1']).map((student_id) => ({ student_id })),
  ...(over.starts_at ? { starts_at: over.starts_at } : {}),
  ...(over.status ? { status: over.status } : {}),
});
