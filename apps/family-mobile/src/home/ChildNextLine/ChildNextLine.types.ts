import type { PortalStudent } from '@ab/shared';
import type { ClockOptions } from '@ab/time';

export interface ChildNextLineProps {
  student: PortalStudent;
  /** The student's clock: the viewer's cycle and language on the student's zone. */
  clock: ClockOptions;
}
