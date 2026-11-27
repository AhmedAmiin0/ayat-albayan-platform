import { useAlerts, useMarkAlertsRead } from '@/features/alerts/alerts-api';

export function useAlertsPage() {
  const alerts = useAlerts();
  const markRead = useMarkAlertsRead();
  const unread = (alerts.data?.unread ?? 0) > 0;
  const markAll = () => markRead.mutate(undefined);
  const readOne = (id: string) => markRead.mutate([id]);
  return { alerts, unread, markAll, readOne };
}
