import type { PortalLesson, PortalStudent } from '@ab/shared';
import type { ClockOptions } from '@ab/time';

export interface CardFooterProps {
  lesson: PortalLesson;
  student: PortalStudent;
  clock: ClockOptions;
  now: Date;
  /** The room is live now (liveRoom). */
  live: boolean;
  onNotice: (message: string) => void;
}
