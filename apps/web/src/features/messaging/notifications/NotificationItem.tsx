import { webNotificationPath, type NotificationItem as Item } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { meQuery } from '@/features/people/auth/me';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { useMarkRead } from './api';
import { notificationStamp, notificationTime } from './format';
import { useClock } from '@/lib/clock';

export interface NotificationItemProps {
  item: Item;
  /** Called after the row is opened (the panel closes). */
  onPick: () => void;
}

/**
 * One bell row: title, body, time; an unread row carries the saffron dot (named for screen
 * readers). Title and body are isolated (dir="auto"): a family's Latin name or message keeps its own
 * direction inside the Arabic UI. Opening it marks it read and goes where the push would (webNotificationPath).
 */
export function NotificationItem({ item, onPick }: NotificationItemProps) {
  const role = useQuery(meQuery).data?.role ?? null;
  const navigate = useNavigate();
  const markRead = useMarkRead();
  const unread = item.read_at === null;
  const clock = useClock();
  const open = () => {
    if (unread) markRead.mutate([item.id]);
    void navigate({ href: webNotificationPath({ ...item.data, kind: item.kind }, role) });
    onPick();
  };
  return (
    <li>
      <button
        type="button"
        onClick={open}
        className={cn(
          'grid w-full grid-cols-[0.5rem_minmax(0,1fr)] gap-x-2.5 gap-y-0.5 px-4 py-3 text-start transition-colors duration-[120ms] hover:bg-sunk',
          unread && 'bg-act-soft/40',
        )}
      >
        <span aria-hidden="true" className={cn('mt-1.5 size-2 rounded-full', unread ? 'bg-act' : 'bg-transparent')} />
        <span className="grid min-w-0 gap-0.5">
          <span className={cn('text-sm text-ink', unread ? 'font-bold' : 'font-medium')}>
            {unread && <span className="sr-only">{`${t.bell.unread}: `}</span>}
            <bdi dir="auto">{item.title}</bdi>
          </span>
          {item.body && (
            <span dir="auto" className="text-xs text-pretty text-ink-2">
              {item.body}
            </span>
          )}
          <time
            dateTime={item.created_at}
            title={notificationStamp(item.created_at, clock)}
            className="text-2xs text-ink-3 tabular-nums"
          >
            {notificationTime(item.created_at, clock)}
          </time>
        </span>
      </button>
    </li>
  );
}
