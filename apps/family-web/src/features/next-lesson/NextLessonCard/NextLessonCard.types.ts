import type { PortalStudent } from '@ab/shared';

export interface Props {
  student: PortalStudent;
  /** A student or an adult reads their own wording. */
  own: boolean;
}
