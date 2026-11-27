import { alertSections, alertTarget } from '@ab/client-core';
import type { NotificationItem, NotificationsPage } from '@ab/shared';
import { useMarkRead, useNow } from '@ab/mobile-kit';
import { useFamilyClock } from '@/portal';
import { openAlert } from '@/nav/hrefs';

/** A tap marks the row read and opens it. */
export function useAlertSections(page: NotificationsPage) {
  const markRead = useMarkRead();
  const clock = useFamilyClock();
  const sections = alertSections(page.items, useNow(), clock.tz);
  const open = (item: NotificationItem): void => {
    if (item.read_at === null) markRead.mutate([item.id]);
    const target = alertTarget(item);
    if (target) openAlert(target);
  };
  return { clock, sections, open };
}
