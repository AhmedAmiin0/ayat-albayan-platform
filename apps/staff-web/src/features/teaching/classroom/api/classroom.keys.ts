import { CLASSROOM_KEY } from '@ab/web-kit/classroom/api/api';
import type { QueryKey } from '@tanstack/react-query';

// One join token per attempt; a retry removes every attempt of the lesson through `joins`.
export const classroomKeys = {
  joins: (lessonId: string): QueryKey => [...CLASSROOM_KEY, 'join', lessonId],
  join: (lessonId: string, attempt: number): QueryKey => [
    ...CLASSROOM_KEY,
    'join',
    lessonId,
    attempt,
  ],
  staffLink: (linkKey: string, userId: string): QueryKey => ['staff-link', linkKey, userId],
  studentLink: (token: string): QueryKey => ['studentLink', token],
};
