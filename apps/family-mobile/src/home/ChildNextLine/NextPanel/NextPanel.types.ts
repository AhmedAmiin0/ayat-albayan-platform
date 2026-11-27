import type { PortalLesson } from '@ab/shared';
import type { ClockOptions } from '@ab/time';

export interface NextPanelProps {
  lesson: PortalLesson;
  clock: ClockOptions;
  now: Date;
}
