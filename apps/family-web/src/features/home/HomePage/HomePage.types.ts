import type { ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';

export interface Props {
  /** The student in view: a student's own, an only child, or the child a guardian picked. */
  student: PortalStudent;
  kind: PortalKind;
  /** The `?tab=` asked for, and the switch. */
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
}
