import type { ThreadView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { threadsQuery } from '@/features/messaging/inbox/api/api';
import { DeliveryTicks } from '@/features/messaging/inbox/messages/components/DeliveryTicks';
import { listTime, previewText, threadName } from '@/features/messaging/inbox/format';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/i18n/i18n';
import { useNow } from '@/lib/time/use-now';
import { cn } from '@/lib/utils';
import { sectionTitle } from '@/features/reporting/dashboard/shared/Bar';

/** How many conversations the dashboard shows; the rest is one click away in the inbox. */
export const RECENT_THREADS = 5;

/** The link's label replaces the ticks' name, so it carries our last message's status word. */
const ticksWord = (th: ThreadView): string =>
  th.last_direction === 'outbound' ? t.enums.messageStatus[th.last_status] : '';

function ThreadItem({ thread: th, now }: { thread: ThreadView; now: Date }) {
  const unread = th.unread_count > 0;
  const name = threadName(th);
  const clock = useClock();
  return (
    <li>
      <Link
        to="/admin/inbox"
        search={{ page: 1, phone: th.phone_e164 }}
        aria-label={[t.inbox.openThread.replace('{name}', name), ticksWord(th)].filter(Boolean).join(' — ')}
        className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 rounded-sm px-2 py-2.5 text-ink no-underline transition-colors duration-150 hover:bg-sunk"
      >
        <span className="flex min-w-0 items-center gap-2">
          {unread && <i aria-hidden="true" className="size-[7px] shrink-0 rounded-full bg-act" />}
          <span className={cn('truncate', unread ? 'font-bold' : 'font-semibold')}>{name}</span>
        </span>
        <time dateTime={th.last_message_at} className="text-2xs text-ink-3 tabular-nums">
          {listTime(th.last_message_at, clock, now)}
        </time>
        <span className="col-span-2 flex min-w-0 items-center gap-1 text-sm text-ink-2">
          {th.last_direction === 'outbound' && <DeliveryTicks status={th.last_status} />}
          <span dir="auto" className="min-w-0 truncate text-start">
            {previewText(th)}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** «أحدث الرسائل»: the newest WhatsApp conversations (GET /threads, first page), each opens in the inbox. */
export function RecentInbox({ className }: { className?: string }) {
  const threads = useQuery(threadsQuery({ page: 1 }));
  const items = threads.data?.items.slice(0, RECENT_THREADS);
  // One ticking clock for the five rows: «14:05» turns into the date at midnight without a remount.
  const now = useNow();
  return (
    <section aria-labelledby="dash-inbox" className={cn('grid content-start gap-2 rounded-md border border-rule p-4', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="dash-inbox" className={sectionTitle}>
          {t.dashboard.home.inbox}
        </h2>
        <Link to="/admin/inbox" search={{ page: 1 }} className="text-sm font-semibold text-lapis">
          {t.dashboard.home.inboxAll}
        </Link>
      </div>
      {threads.isPending && <ListSkeleton rows={3} />}
      {/* The page's one alert is the dashboard's own; this box just says it. */}
      {threads.isError && <p className="text-sm text-danger">{t.common.error}</p>}
      {items?.length === 0 && (
        <div className="grid justify-items-center gap-1 py-8 text-center">
          <p className="font-semibold">{t.dashboard.home.inboxEmpty}</p>
          <p className="text-sm text-ink-3">{t.dashboard.home.inboxEmptyHint}</p>
        </div>
      )}
      {items && items.length > 0 && (
        <ul className="grid">
          {items.map((th) => (
            <ThreadItem key={th.phone_e164} thread={th} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}
