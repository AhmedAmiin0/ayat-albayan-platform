import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { Tabs } from '@/components/ui/layout/tabs';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { t } from '@/lib/i18n/i18n';
import { salesSubscriptionsQuery, type SubscriptionKind } from '../api';
import { historyColumn } from './history-column';
import { salesSubscriptionColumns } from './sales-subscription-columns';
import { SubscriptionHistory } from './SubscriptionHistory';

const KINDS = (): { value: SubscriptionKind; label: string }[] => [
  { value: 'pending', label: t.sales.subscriptions.pending },
  { value: 'confirmed', label: t.sales.subscriptions.confirmed },
];

export interface SalesSubscriptionsProps {
  /** The open list, from the route (`?kind=confirmed`; pending is the default). */
  kind: SubscriptionKind;
  onKind: (kind: SubscriptionKind) => void;
  /** «مؤكدة» only: the subscription whose history is open (`?history=`), and how to open / close it. */
  history?: string | undefined;
  onHistory?: (id: string | null) => void;
}

/**
 * /sales/subscriptions «الاشتراكات»: my subscriptions in two separate lists, «في الانتظار» and
 * «مؤكدة», never mixed. Only the selected kind is fetched; every column sorts and filters locally.
 * No price, no payment. On «مؤكدة» each row opens its history («السجل»: the student's subscriptions,
 * status changes, lessons and payment dates; docs/16).
 */
export function SalesSubscriptions({ kind, onKind, history, onHistory }: SalesSubscriptionsProps) {
  const list = useQuery(salesSubscriptionsQuery(kind));
  const withHistory = kind === 'confirmed' && onHistory !== undefined;
  const columns = useMemo(
    () => (withHistory ? [...salesSubscriptionColumns, historyColumn((id) => onHistory(id))] : salesSubscriptionColumns),
    [withHistory, onHistory],
  );
  return (
    <>
      <PageHead>
        <Cartouche>{t.sales.nav.subscriptions}</Cartouche>
      </PageHead>
      <Tabs label={t.sales.subscriptions.kinds} tabs={KINDS()} value={kind} onChange={onKind} />
      <div role="tabpanel" aria-label={t.sales.subscriptions[kind]}>
        {withHistory && history && <SubscriptionHistory key={history} id={history} onClose={() => onHistory(null)} />}
        {list.isPending && <ListSkeleton />}
        {list.isError && (
          <FormAlert>
            {t.sales.loadFailed}{' '}
            <Button type="button" variant="secondary" size="sm" onClick={() => void list.refetch()}>
              {t.sales.retry}
            </Button>
          </FormAlert>
        )}
        {list.data && (
          <DataTable
            // A new kind starts with no sort or filter.
            key={kind}
            stacked
            clientSort
            clientFilter
            columns={columns}
            data={list.data}
            getRowId={(s) => s.id}
            emptyText={kind === 'pending' ? t.sales.subscriptions.emptyPending : t.sales.subscriptions.emptyConfirmed}
          />
        )}
      </div>
    </>
  );
}
