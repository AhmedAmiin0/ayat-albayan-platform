import type { PortalHistoryStatus } from '@ab/shared';
import { useChildHistory } from '@/portal';

export function useHistoryPanel(studentId: string, status: PortalHistoryStatus) {
  const history = useChildHistory(studentId, status);
  const more = history.isFetchingNextPage;
  const loadMore = (): void => void history.fetchNextPage();
  return { history, more, loadMore };
}
