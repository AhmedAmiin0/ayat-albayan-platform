import { useMarkRead, useNotifications } from '@ab/mobile-kit';

export function useAlertsScreen() {
  const list = useNotifications();
  const markRead = useMarkRead();
  const unread = (list.data?.unread ?? 0) > 0;
  return { list, markRead, unread };
}
