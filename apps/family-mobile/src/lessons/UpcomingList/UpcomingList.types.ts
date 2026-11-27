import type { PortalLesson, PortalStudent } from '@ab/shared';

export interface UpcomingListProps {
  lessons: readonly PortalLesson[];
  student: PortalStudent;
  now: Date;
  own?: boolean;
}
