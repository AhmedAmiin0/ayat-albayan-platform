import type { ReactElement } from 'react';

export interface TodayPageProps {
  /** The whole page: one block of cards. */
  header: ReactElement;
  /** The viewer's pull is running. */
  refreshing: boolean;
  onRefresh: () => void;
}
