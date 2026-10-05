import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { Tabs } from '@/components/ui/tabs';
import { ListSkeleton } from '@/components/ui/skeleton';
import { t } from '@/lib/i18n';
import { salesSubscriptionsQuery, type SubscriptionKind } from './api';
import { salesSubscriptionColumns } from './sales-subscription-columns';

const KINDS = (): { value: SubscriptionKind; label: string }[] => [
  { value: 'pending', label: t.sales.subscriptions.pending },
  { value: 'confirmed', label: t.sales.subscriptions.confirmed },
];

export interface SalesSubscriptionsProps {
  /** The open list, from the route (`?kind=confirmed`; pending is the default). */
  kind: SubscriptionKind;
  onKind: (kind: SubscriptionKind) => void;
}

/**
 * /sales/subscriptions «الاشتراكات»: my subscriptions in two separate lists, «في الانتظار» and
 * «مؤكدة», never mixed. Only the selected kind is fetched; every column sorts and filters locally.
 * No price, no payment.
 */
export function SalesSubscriptions({ kind, onKind }: SalesSubscriptionsProps) {
  const list = useQuery(salesSubscriptionsQuery(kind));
  return (
    <>
      <PageHead>
        <Cartouche>{t.sales.nav.subscriptions}</Cartouche>
      </PageHead>
      <Tabs label={t.sales.subscriptions.kinds} tabs={KINDS()} value={kind} onChange={onKind} />
      <div role="tabpanel" aria-label={t.sales.subscriptions[kind]}>
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
            columns={salesSubscriptionColumns}
            data={list.data}
            getRowId={(s) => s.id}
            emptyText={kind === 'pending' ? t.sales.subscriptions.emptyPending : t.sales.subscriptions.emptyConfirmed}
          />
        )}
      </div>
    </>
  );
}
