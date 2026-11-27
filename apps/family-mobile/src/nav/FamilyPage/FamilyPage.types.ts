import type { ReactNode } from 'react';

export interface FamilyPageProps {
  /** The screen's FamilyHeader. */
  header: ReactNode;
  /** Pull to refresh: the screen's own read again (the spinner is the viewer's pull only). */
  onRefresh: () => unknown;
  children: ReactNode;
}
