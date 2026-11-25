import { courseCardKey, coursePauseKey } from '@ab/client-core';
import type { QueryKey } from '@tanstack/react-query';

interface PauseWindow {
  studentId: string;
  from: string;
  until: string | null;
}

// The preview sits under the pause state and the resume preview under the course card, so the
// invalidations a pause or a course action already runs reach them.
export const pauseKeys = {
  preview: ({ studentId, from, until }: PauseWindow): QueryKey => [
    ...coursePauseKey(studentId),
    'preview',
    from,
    until,
  ],
  resume: (studentId: string): QueryKey => [...courseCardKey(studentId), 'resume'],
};
