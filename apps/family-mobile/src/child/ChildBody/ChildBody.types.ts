import type { PortalKind, PortalStudent } from '@ab/shared';

export interface ChildBodyProps {
  student: PortalStudent;
  kind: PortalKind;
}

export interface ChildPanelProps extends ChildBodyProps {
  own: boolean;
}
