import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';
import { useNow } from '@/lib/time/use-now';
import { notificationsQuery } from './api';
import { NotificationItem } from './NotificationItem';

/**
 * The panel's rows: loading, a failed first load with a retry (a failed poll keeps the rows it
 * had), empty, or the latest 20. Shares the bell's query, so opening the panel costs no request.
 */
export function NotificationList({ onPick }: { onPick: () => void }) {
  const list = useQuery(notificationsQuery);
  // One ticking clock for every row (not one timer per row): the times age while the panel is open.
  const now = useNow();
  if (list.isPending) return <ListSkeleton rows={3} className="px-4" />;
  if (list.isError && !list.data) {
    return (
      <div className="grid justify-items-start gap-2 px-4 py-4">
        <p role="alert" className="text-danger">
          {t.bell.loadError}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => void list.refetch()}>
          {t.bell.retry}
        </Button>
      </div>
    );
  }
  const items = list.data?.items ?? [];
  if (items.length === 0) return <p className="px-4 py-6 text-center text-ink-3">{t.bell.empty}</p>;
  return (
    <ul className="divide-y divide-rule">
      {items.map((item) => (
        <NotificationItem key={item.id} item={item} onPick={onPick} now={now} />
      ))}
    </ul>
  );
}
