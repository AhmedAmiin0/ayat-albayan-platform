import type { PortalLesson } from '@ab/shared';
import type { ClockOptions } from '@ab/time';

export interface RequestLineProps {
  lesson: PortalLesson;
  /** The student's clock. */
  clock: ClockOptions;
  /** The words' colour (white on the lapis card, ink-2 on a row). */
  ink: string;
  now: Date;
  student: string;
}
