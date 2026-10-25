import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Button } from '@/components/ui/form/button';
import { t } from '@/lib/i18n';
import { notificationsQuery, useMarkRead } from './api';
import { NotificationList } from './NotificationList';
import { WebPushToggle } from './WebPushToggle';

export interface NotificationPanelProps {
  /** Close the panel (a row was opened). */
  onPick: () => void;
}

/**
 * The bell's drop-down (R-NOT-01): heading, «تحديد الكل كمقروء» while anything is unread, the
 * latest rows, and browser push at its foot.
 */
export function NotificationPanel({ onPick }: NotificationPanelProps) {
  const unread = useQuery(notificationsQuery).data?.unread ?? 0;
  const markAll = useMarkRead();
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="grid text-sm text-ink">
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-rule px-4 py-2">
        <h2 id={titleId} className="text-base font-bold">
          {t.bell.title}
        </h2>
        {unread > 0 && (
          <Button type="button" variant="ghost" size="sm" disabled={markAll.isPending} onClick={() => markAll.mutate(undefined)}>
            {t.bell.markAll}
          </Button>
        )}
      </header>
      <div className="max-h-[min(26rem,60dvh)] overflow-y-auto overscroll-contain">
        <NotificationList onPick={onPick} />
      </div>
      <WebPushToggle />
    </section>
  );
}
