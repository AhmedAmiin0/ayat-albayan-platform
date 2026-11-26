import type { ChildTab } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';

export interface Props {
  home: PortalHome;
  studentId: string;
  tab?: ChildTab;
  onTab: (tab: ChildTab) => void;
}
