import {
  courseActionsKey,
  courseCardKey,
  type CardTree,
  type CourseMoveKind,
} from '@ab/client-core';
import type { QueryKey } from '@tanstack/react-query';

interface CourseRef {
  studentId: string;
  subscriptionId: string;
}

// Every course action invalidates the student's actions key, which also covers the card.
export const courseKeys = {
  stopPreview: ({ studentId, subscriptionId }: CourseRef): QueryKey => [
    ...courseActionsKey(studentId),
    'stop',
    subscriptionId,
  ],
  move: ({ studentId, subscriptionId }: CourseRef, kind: CourseMoveKind): QueryKey => [
    ...courseActionsKey(studentId),
    kind,
    subscriptionId,
  ],
  teachers: (studentId: string): QueryKey => [...courseActionsKey(studentId), 'teachers'],
  card: (studentId: string, tree: CardTree): QueryKey => [...courseCardKey(studentId), tree],
  extend: ({ studentId, subscriptionId }: CourseRef): QueryKey => [
    ...courseCardKey(studentId),
    'extend',
    subscriptionId,
  ],
  cardLesson: (lessonId: string): QueryKey => ['course-card-lesson', lessonId],
};
