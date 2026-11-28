import { tabIds } from '@ab/web-kit/components/ui/layout/tabs';
import type { TabPanelProps } from './TabPanel.types';

/**
 * The open panel of a Tabs strip. It continues the page's flex column (docs/66 section 1), so a
 * fill table inside it takes the height the frame has left and stays the view's one scroller.
 */
export function TabPanel({ idPrefix, value, children }: TabPanelProps) {
  const ids = tabIds(idPrefix, value);
  return (
    <div
      role="tabpanel"
      id={ids.panel}
      aria-labelledby={ids.tab}
      tabIndex={0}
      className="flex min-h-0 flex-1 flex-col pt-4"
    >
      {children}
    </div>
  );
}
