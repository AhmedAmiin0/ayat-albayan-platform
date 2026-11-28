import type { ReactNode } from 'react';

export interface TabPanelProps {
  /** The same `idPrefix` as the Tabs strip, so the panel and its tab name each other (tabIds). */
  idPrefix: string;
  /** The selected tab's value; only the open panel is rendered. */
  value: string;
  children: ReactNode;
}
