import type { PortalLessons, PortalStudent } from '@ab/shared';

export interface UpcomingProps {
  lessons: PortalLessons;
  student: PortalStudent;
  /** A student's own page (their own words). */
  own: boolean;
}
