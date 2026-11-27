import type { PortalLesson, PortalStudent } from '@ab/shared';
import type { ClockOptions } from '@ab/time';
import type { ReactNode } from 'react';

export interface OptionsRowProps {
  lesson: PortalLesson;
  student: PortalStudent;
  /** The student's clock. */
  clock: ClockOptions;
  now: Date;
  /** The row's words (time, teacher, what the family asked). */
  children: ReactNode;
}
