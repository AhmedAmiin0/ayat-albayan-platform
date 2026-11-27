import type { PortalStudent } from '@ab/shared';

export interface ChildCardProps {
  student: PortalStudent;
  /** The package summary: a guardian's (seesMoney). */
  money: boolean;
  onOpen: () => void;
}
