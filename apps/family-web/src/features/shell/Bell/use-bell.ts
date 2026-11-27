import { useAlerts } from '@/features/alerts';
import { t } from '@ab/web-kit';

export function useBell() {
  const unread = useAlerts().data?.unread ?? 0;
  const label = unread > 0 ? t.bell.openUnread.replace('{n}', String(unread)) : t.bell.open;
  return { unread, label };
}
