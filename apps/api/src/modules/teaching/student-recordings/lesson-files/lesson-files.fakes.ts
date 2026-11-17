import type { AuthUser } from '@/common/auth/verify-token';
import type { LessonFileRow, LessonRef } from './lesson-files.repo';

// Test helpers (not a test): one lesson, its teacher, and one file of it.

export const LESSON = '11111111-1111-4111-8111-111111111111';
export const FILE = '22222222-2222-4222-8222-222222222222';
export const TEACHER_ID = 'T1';

const user = (id: string, role: AuthUser['role']): AuthUser => ({ id, email: null, role });
export const ADMIN = user('admin-1', 'admin');
export const TEACHER = user('teacher-1', 'teacher');
export const OTHER_TEACHER = user('teacher-2', 'teacher');
export const GUARDIAN = user('guardian-1', 'guardian');

export const lessonRef = (): LessonRef => ({
  id: LESSON,
  teacher_id: TEACHER_ID,
  starts_at: '2026-11-16T16:00:00.000Z',
  ends_at: '2026-11-16T16:45:00.000Z',
});

export const fileRow = (over: Partial<LessonFileRow> = {}): LessonFileRow => ({
  id: FILE,
  lesson_id: LESSON,
  kind: 'homework',
  title: 'ورقة الواجب',
  mime: 'image/png',
  size: 900,
  storage_path: `${LESSON}/a.png`,
  visible_to_family: true,
  created_by: 'teacher-1',
  created_at: '2026-11-16T17:00:00.000Z',
  ...over,
});

/** idByProfile: teacher-1 teaches T1, anyone else no lesson. */
export const teachersFake = () => ({
  idByProfile: (id: string) => Promise.resolve(id === 'teacher-1' ? TEACHER_ID : 'T9'),
});
