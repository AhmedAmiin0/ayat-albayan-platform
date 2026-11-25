import type { LessonStatus } from '@ab/catalog';
import type { Conflict } from '@ab/schedule';
import { CONSUMING_LESSON_STATUSES } from '@ab/money';
import type { BookedCourse } from './course-follow';

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

/** lessons_total minus the course's lessons before the change point that count (≤ 0 = course_finished). */
export const courseRemaining = (
  lessonsTotal: number,
  before: readonly CourseLessonFact[],
): number => lessonsTotal - before.filter(countsTowardCourse).length;

/** POST …/course/change/check: the clashes over the whole remaining course, and what is left. */
export interface CourseChangeCheck {
  conflicts: Conflict[];
  /** Lessons the new days carry (lessons_total − counted). */
  remaining: number;
  /** The local date of the remaining-th new lesson: the new rules' ends_on. */
  endsOn: string;
}

/** POST …/course/change: the course's new rules (the first one first) and its new last day. */
export interface CourseChangeResult {
  subscriptionId: string;
  ruleIds: string[];
  endsOn: string | null;
}

/** GET /booking/course/change (admin), or built from SalesCourseView.current: what the change dialog needs. */
export interface CourseChangeView {
  student: { id: string; name: string; code: string; tz: string };
  course: BookedCourse;
}

/** GET /students/:id/course-teacher|course-times/change. */
export interface ProfileCourseView extends CourseChangeView {
  /** The course's next open lesson (local date, course zone; its instant); null = none. */
  nextLesson: { startsOn: string; startsAt: string } | null;
}
