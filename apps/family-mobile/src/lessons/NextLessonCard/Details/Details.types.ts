import type { PortalLesson, PortalStudent } from '@ab/shared';
import type { ClockOptions } from '@ab/time';

export interface DetailsProps {
  lesson: PortalLesson;
  student: PortalStudent;
  clock: ClockOptions;
  now: Date;
}
