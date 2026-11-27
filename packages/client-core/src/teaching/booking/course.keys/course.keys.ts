import { courseActionsKey } from '../course-actions';
import { courseCardKey } from '../course-card';
import { coursePauseKey } from '../course-pause';
import type { CourseKeys, PauseKeys } from './course.keys.types';

// Every course action invalidates the student's actions key, which also covers the card, so the
// stop and move previews, the teachers and the card refresh together (web and mobile).
export const courseKeys: CourseKeys = {
  stopPreview: ({ studentId, subscriptionId }) => [
    ...courseActionsKey(studentId),
    'stop',
    subscriptionId,
  ],
  move: ({ studentId, subscriptionId }, kind) => [
    ...courseActionsKey(studentId),
    kind,
    subscriptionId,
  ],
  current: (studentId, source) => [...courseActionsKey(studentId), 'current', source],
  teachers: (studentId) => [...courseActionsKey(studentId), 'teachers'],
  card: (studentId, tree) => [...courseCardKey(studentId), tree],
  extend: ({ studentId, subscriptionId }) => [
    ...courseCardKey(studentId),
    'extend',
    subscriptionId,
  ],
  cardLesson: (lessonId) => ['course-card-lesson', lessonId],
};

// The preview sits under the pause state and the resume preview under the course card, so the
// invalidations a pause or a course action already runs reach them.
export const pauseKeys: PauseKeys = {
  preview: ({ studentId, from, until }) => [...coursePauseKey(studentId), 'preview', from, until],
  resume: (studentId) => [...courseCardKey(studentId), 'resume'],
};
