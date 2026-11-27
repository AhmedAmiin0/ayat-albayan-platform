import { bellBadge } from '../notifications-cache';
import { useNotifications } from '../use-notifications';

export function useBellButton() {
  const unread = useNotifications().data?.unread ?? 0;
  const badge = bellBadge(unread);
  return { unread, badge };
}
