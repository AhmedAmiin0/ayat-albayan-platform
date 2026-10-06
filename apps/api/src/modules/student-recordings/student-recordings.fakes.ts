// Test fixtures for the student recordings tests (not shipped; excluded from the build by *.fakes.ts).
import { vi } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import type { RecordingRow } from '../classroom/recording.queries';
import type { RecordingJoinRow } from './student-recordings.mapper';

export const STUDENT = '00000000-0000-4000-8000-0000000000c1';
export const SIBLING = '00000000-0000-4000-8000-0000000000c2';
export const REC_ID = '00000000-0000-4000-8000-0000000000aa';
export const TEACHER_ID = 'teacher-1';
export const OTHER_TEACHER_ID = 'teacher-2';

const user = (prefix: string, role: AuthUser['role']): AuthUser => ({ id: `${prefix}0000000-0000-4000-8000-000000000001`, email: null, role });
export const ADMIN = user('a', 'admin');
export const TEACHER = user('b', 'teacher');
export const OTHER_TEACHER = user('f', 'teacher');
export const ASSISTANT = user('d', 'assistant');
export const OTHER_ASSISTANT = user('e', 'assistant');
export const GUARDIAN = user('c', 'guardian');
export const SALES = user('9', 'sales');

export const recording = (over: Partial<RecordingRow> = {}): RecordingRow => ({
  id: REC_ID,
  lesson_id: '00000000-0000-4000-8000-0000000000d1',
  meeting_id: null,
  egress_id: 'EG_1',
  status: 'done',
  file_path: 'lessons/00000000-0000-4000-8000-0000000000d1/2026-10-05T16-00-00-000Z.mp4',
  started_at: '2026-10-05T16:00:00.000Z',
  ended_at: '2026-10-05T17:00:00.000Z',
  error: null,
  size_bytes: 52_428_800,
  visible_to_student: false,
  deleted_at: null,
  ...over,
});

export const joinRow = (over: Partial<RecordingRow> = {}, teacherId = TEACHER_ID): RecordingJoinRow => ({
  ...recording(over),
  lessons: { starts_at: '2026-10-05T16:00:00.000Z', teacher_id: teacherId, teachers: { id: teacherId, display_name_ar: 'أ. منى', display_name_en: 'Ms. Mona' } },
});

/** Mocked StudentRecordingQueries: student s1 assigned to TEACHER_ID, one recording. */
export function studentQueries() {
  return {
    student: vi.fn().mockResolvedValue({ id: STUDENT, teacher_id: TEACHER_ID }),
    taughtBy: vi.fn().mockResolvedValue(false),
    assists: vi.fn().mockResolvedValue(false),
    doneLessonIds: vi.fn().mockResolvedValue(['les-1']),
    page: vi.fn().mockResolvedValue({ rows: [joinRow()], total: 1 }),
  };
}

export const teachersFake = () => ({
  idByProfile: vi.fn(async (id: string) => (id === TEACHER.id ? TEACHER_ID : id === OTHER_TEACHER.id ? OTHER_TEACHER_ID : null)),
});
