import type { PortalLesson } from '@ab/shared';

export interface JoinNowProps {
  lesson: PortalLesson;
  studentId: string;
  short: boolean;
  live: boolean;
  /** The error line's colour. */
  ink: string;
}
