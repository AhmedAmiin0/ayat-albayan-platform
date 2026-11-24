import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { Tabs } from '@ab/web-kit/components/ui/layout/tabs';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { SalesSubscriptionKind } from '@ab/shared';
import { salesSubscriptionsQuery } from '@/features/sales/sales/api';
import { historyColumn } from '@/features/sales/sales/subscriptions/history-column';
import { salesSubscriptionColumns } from '@/features/sales/sales/subscriptions/sales-subscription-columns';
import { SubscriptionHistory } from '@/features/sales/sales/subscriptions/SubscriptionHistory';

const KINDS = (): { value: SalesSubscriptionKind; label: string }[] => [
  { value: 'pending', label: t.sales.subscriptions.pending },
  { value: 'confirmed', label: t.sales.subscriptions.confirmed },
];

export interface SalesSubscriptionsProps {
  /** The open list, from the route (`?kind=confirmed`; pending is the default). */
  kind: SalesSubscriptionKind;
  onKind: (kind: SalesSubscriptionKind) => void;
  /** Confirmed only: the subscription whose history is open (`?history=`). */
  history?: string | undefined;
  onHistory?: (id: string | null) => void;
}

/** Two lists never mixed, only the selected kind fetched; no price or payment (docs/16). */
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
