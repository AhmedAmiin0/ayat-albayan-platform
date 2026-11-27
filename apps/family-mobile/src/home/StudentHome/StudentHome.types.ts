import type { PortalKind, PortalStudent } from '@ab/shared';

export interface StudentHomeProps {
  student: PortalStudent;
  /** Who reads it: the student or an adult, or a guardian; the wording differs. */
  kind: PortalKind;
}
