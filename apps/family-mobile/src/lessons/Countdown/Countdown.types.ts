import type { PortalLesson } from '@ab/shared';

export interface CountdownProps {
  lesson: PortalLesson;
  /** The screen's clock, ticking every second. */
  now: Date;
  /** The child's page: the timer is the card's main figure (canvas Child). */
  big?: boolean;
}
