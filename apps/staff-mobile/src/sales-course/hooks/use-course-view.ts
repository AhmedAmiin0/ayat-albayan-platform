import type { CourseBlock, SalesCourseView } from '@ab/shared';
import { useState } from 'react';
import { courseBlock } from '@/sales-course/lib/course-body';
import { useSalesCourse } from './course-queries';

export interface CourseViewState {
  course: ReturnType<typeof useSalesCourse>;
  /** The bookable view the wizard runs on, latched; else the latest read. */
  view: SalesCourseView | undefined;
  block: CourseBlock | null;
}

/** The first fresh bookable view is latched so a later course_exists read cannot replace it. */
export function useCourseView(studentId: string): CourseViewState {
  const course = useSalesCourse(studentId);
  const [latched, setLatched] = useState<SalesCourseView | null>(null);
  const read = course.data;
  const fresh = course.isFetchedAfterMount && !course.isFetching;
  const mine = latched?.student.id === studentId ? latched : null;
  // Derived state, set while rendering (React's pattern for state kept from an earlier read).
  if (!mine && fresh && read && !courseBlock(read)) setLatched(read);
  const view = mine ?? read;
  return { course, view, block: view ? courseBlock(view) : null };
}
