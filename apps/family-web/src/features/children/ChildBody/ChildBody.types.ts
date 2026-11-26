import type { ChildTab } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';

export interface Props {
  student: PortalStudent;
  kind: PortalKind;
  /** The `?tab=` asked for; the page's own state otherwise. */
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
  /** The home shows the next lesson above the tabs, so the upcoming tab lists the rest. */
  exceptNext?: boolean;
}
