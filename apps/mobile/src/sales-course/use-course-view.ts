import type { CourseBlock, SalesCourseView } from '@ab/shared';
import { useState } from 'react';
import { courseBlock } from './course-body';
import { useSalesCourse } from './course-queries';

export interface CourseViewState {
  course: ReturnType<typeof useSalesCourse>;
  /** The bookable view the wizard runs on, latched; else the latest read. */
  view: SalesCourseView | undefined;
  block: CourseBlock | null;
}

/**
 * GET /sales/booking/course, with the first bookable view latched while the screen is open: «احجز»
 * refetches the course, and the fresh read (course_exists, the course is hers now) must not swap
 * the wizard's booked panel for that refusal.
 */
export function useCourseView(studentId: string): CourseViewState {
  const course = useSalesCourse(studentId);
  const [latched, setLatched] = useState<SalesCourseView | null>(null);
  const read = course.data;
  const mine = latched?.student.id === studentId ? latched : null;
  // Derived state, set while rendering (React's pattern for state kept from an earlier read).
  if (!mine && read && !courseBlock(read)) setLatched(read);
  const view = mine ?? read;
  return { course, view, block: view ? courseBlock(view) : null };
}
