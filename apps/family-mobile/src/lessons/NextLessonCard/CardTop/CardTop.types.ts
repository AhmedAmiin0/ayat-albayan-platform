import type { PortalLesson } from '@ab/shared';
import type { ClockOptions } from '@ab/time';

export interface CardTopProps {
  lesson: PortalLesson;
  clock: ClockOptions;
  now: Date;
  full: boolean;
  own: boolean;
}
