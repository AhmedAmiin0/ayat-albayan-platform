import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';
import { subscriptionHistoryQuery } from '@/features/sales/sales/academy-api';
import { HistoryEntryCard } from './HistoryEntryCard';

export interface SubscriptionHistoryProps {
  /** The opened subscription (one of mine; the API answers 404 otherwise). */
  id: string;
  onClose: () => void;
}

/** The history of one confirmed subscription: the student's subscriptions oldest first, the opened one marked. */
export function SubscriptionHistory({ id, onClose }: SubscriptionHistoryProps) {
  const history = useQuery(subscriptionHistoryQuery(id));
  const name = history.data?.student.name ?? '';
  return (
    <section aria-label={t.sales.history.title.replace('{name}', name)} className="mb-4 grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-h3 font-bold">{t.sales.history.title.replace('{name}', name)}</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t.sales.history.close}
        </Button>
      </div>
      {history.isPending && <ListSkeleton />}
      {history.isError && <FormAlert>{t.sales.loadFailed}</FormAlert>}
      {history.data && (
        <ol className="grid gap-3">
          {history.data.subscriptions.map((s) => (
            <HistoryEntryCard key={s.id} entry={s} current={s.id === history.data.subscription_id} />
          ))}
        </ol>
      )}
    </section>
  );
}
