import type { PortalStudent } from '@ab/shared';

export interface UpcomingPanelProps {
  student: PortalStudent;
  /** A student's own page (their own words). */
  own: boolean;
}
