import type { PortalKind, PortalStudent } from '@ab/shared';

export interface ChildSummaryCardProps {
  student: PortalStudent;
  kind: PortalKind;
  onChoose: () => void;
}
