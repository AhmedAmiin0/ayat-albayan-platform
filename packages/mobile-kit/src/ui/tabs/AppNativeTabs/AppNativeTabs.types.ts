import type { TabIconName } from '../tab-icons';

export interface TabItem {
  /** The route segment of the tab (folder or file under the layout). */
  name: string;
  title: string;
  icon: TabIconName;
  /** The held role lacks the permission: the tab leaves the bar (permission-aware nav). */
  hidden?: boolean;
  /** Count text on the tab (already formatted); none, no badge. */
  badge?: string;
}

export interface AppNativeTabsProps {
  tabs: readonly TabItem[];
}
