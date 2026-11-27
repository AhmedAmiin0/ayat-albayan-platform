import type { PortalKind, PortalStudent } from '@ab/shared';

export interface ChildSummaryCardProps {
  student: PortalStudent;
  kind: PortalKind;
  /** The whole card is one button that switches to working as this child. */
  onPress: () => void;
}
