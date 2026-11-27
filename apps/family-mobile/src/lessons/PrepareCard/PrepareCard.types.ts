import type { PortalLessons, PortalStudent } from '@ab/shared';

export interface PrepareCardProps {
  lessons: PortalLessons;
  student: PortalStudent;
  /** The child's upcoming tab: both parts under their titles and a link to the report. */
  full?: boolean;
  own?: boolean;
}
