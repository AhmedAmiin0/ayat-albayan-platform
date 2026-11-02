// Test fixtures for the student's long-lived link (not shipped; excluded from the build by *.fakes.ts).
import { DEFAULT_JOIN_WINDOW } from '@ab/shared';
import { vi } from 'vitest';
import { LESSON, STUDENT_ID } from '@/modules/teaching/classroom/classroom.fakes';
import { hashLinkToken } from '@/modules/teaching/classroom/join/join-link.token';
import type { StudentLesson } from './student-link.repo';

export const STUDENT_TOKEN = 'ZYXWVUTSRQPONMLKJIHGFEDCBA_-9876';
export const LESSON_LINK_ID = '00000000-0000-4000-8000-0000000000f9';
/** The fixture lesson (16:00 to 17:00 UTC, open 15:45 to 19:00) as the student link reads it. */
export const STUDENT_LESSON: StudentLesson = {
  id: LESSON.id,
  starts_at: LESSON.starts_at,
  ends_at: LESSON.ends_at,
  room_opened_at: null,
  teacher_name: 'أبرار',
};
/** Two days later, same hours. */
export const LATER_LESSON: StudentLesson = {
  ...STUDENT_LESSON,
  id: '00000000-0000-4000-8000-0000000000d2',
  starts_at: '2026-10-07T16:00:00.000Z',
  ends_at: '2026-10-07T17:00:00.000Z',
};

/** Mocked StudentLinkQueries with the happy-path defaults. */
export function studentLinkQueries() {
  return {
    student: vi.fn().mockResolvedValue({ id: STUDENT_ID, name: 'سهيلة محمد' }),
    saveLink: vi.fn().mockResolvedValue(undefined),
    linkByHash: vi.fn(async (hash: string) =>
      hash === hashLinkToken(STUDENT_TOKEN) ? ({ id: 'sl1', student_id: STUDENT_ID, revoked_at: null as string | null }) : null,
    ),
    lessonsAhead: vi.fn().mockResolvedValue([STUDENT_LESSON, LATER_LESSON]),
    joinWindow: vi.fn().mockResolvedValue(DEFAULT_JOIN_WINDOW),
    lessonLinkId: vi.fn().mockResolvedValue(LESSON_LINK_ID),
  };
}
