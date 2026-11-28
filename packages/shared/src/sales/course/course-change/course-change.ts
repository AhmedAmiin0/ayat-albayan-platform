import type { LessonStatus } from '@ab/catalog';
import { CONSUMING_LESSON_STATUSES } from '@ab/money';

// Lessons left at a change point use the balance views' rule (migration 190); pure.

/** Statuses that take one of the course's lessons. */
export const COURSE_COUNTED_STATUSES = [
  ...CONSUMING_LESSON_STATUSES,
  'scheduled',
  'confirmed',
] as const satisfies readonly LessonStatus[];

export interface CourseLessonFact {
  status: LessonStatus;
  /** lesson_students.chargeable of the course's student. */
  chargeable: boolean;
  /** lessons.makeup_of_id is set. */
  makeup: boolean;
  /** lessons.instant. */
  instant: boolean;
}

export function countsTowardCourse(l: CourseLessonFact): boolean {
  return (
    l.chargeable &&
    !l.makeup &&
    !l.instant &&
    (COURSE_COUNTED_STATUSES as readonly string[]).includes(l.status)
  );
}

/**
 * lessons_total minus the course's lessons before the change point that count
 * (≤ 0 = course_finished).
 */
export const courseRemaining = (
  lessonsTotal: number,
  before: readonly CourseLessonFact[],
): number => lessonsTotal - before.filter(countsTowardCourse).length;
