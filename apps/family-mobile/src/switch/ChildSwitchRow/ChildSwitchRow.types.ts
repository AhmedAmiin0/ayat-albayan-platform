import type { PortalKind, PortalStudent } from '@ab/shared';

export interface ChildSwitchRowProps {
  student: PortalStudent;
  kind: PortalKind;
  /** The child the app works as now. */
  current: boolean;
  onPress: () => void;
}
