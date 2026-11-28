import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { Button, t, notificationsQuery, useMarkRead, WebPushToggle } from '@ab/web-kit';
import { NotificationList } from './NotificationList';

export interface NotificationPanelProps {
  /** Close the panel (a row was opened). */
  onPick: () => void;
  /** Inside a scrolling sheet: the list flows, so the sheet body stays the only scroller. */
  bare?: boolean;
}

const POPOVER = 'max-h-[min(26rem,60dvh)] overflow-y-auto overscroll-contain';

/** R-NOT-01. */
export function NotificationPanel({ onPick, bare = false }: NotificationPanelProps) {
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
      <div className={bare ? undefined : POPOVER}>
        <NotificationList onPick={onPick} />
      </div>
      <WebPushToggle />
    </section>
  );
}
