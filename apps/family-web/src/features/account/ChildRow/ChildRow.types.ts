import type { PortalStudent } from '@ab/shared';

export interface Props {
  student: PortalStudent;
  /** The child's name, or a self label for a guardian who studies. */
  label: string;
  /** This child is the one the pages show now. */
  current: boolean;
  onChoose: () => void;
}
