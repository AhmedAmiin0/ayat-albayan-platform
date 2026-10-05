import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { TableBox } from '@/components/TableBox';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { Icon } from '@/components/ui/icon';
import { PageHead } from '@/components/ui/page';
import { Pager } from '@/components/ui/pager';
import { Toast } from '@/components/ui/toast';
import { ListSkeleton } from '@/components/ui/skeleton';
import { RecordPaymentDialog } from '@/features/payments/RecordPaymentDialog';
import { t } from '@/lib/i18n';
import { toFilterSearch, toSortSearch } from '@/lib/list-search';
import { MONEY_KEY, setPaused, subscriptionsQuery, type SubscriptionView } from './api';
import { CreateSubscriptionDialog } from './CreateSubscriptionDialog';
import { OpenTasks } from './OpenTasks';
import { subscriptionsTable, type SubscriptionsUrlSearch } from './search';
import { subscriptionColumns } from './subscription-columns';
import { useSubscriptionFilters } from './use-subscription-filters';

type Props = {
  search: SubscriptionsUrlSearch;
  /** A patch of the URL search (the route re-validates it); filter and sort changes pass `page: undefined`. */
  onSearch: (patch: Record<string, unknown>) => void;
  onOpenStudent: (studentId: string) => void;
};

/** /admin/subscriptions (R-SUB-01/02): packages by status, sort + filters (URL), new, pay, tasks. */
export function SubscriptionsPage({ search, onSearch, onOpenStudent }: Props) {
  const queryClient = useQueryClient();
  const { status, page = 1 } = search;
  const table = subscriptionsTable(search);
  const list = useQuery(subscriptionsQuery({ status, page, ...table }));
  const reset = (patch: Record<string, unknown>) => onSearch({ ...patch, page: undefined });
  const filterValues = { student: search.f_student ?? '', package: search.f_package ?? '' };
  const extra = useSubscriptionFilters({ status, onChange: reset });
  // A filter that matches nothing keeps the table (its toolbar and chips) on screen.
  const bare = list.data?.total === 0 && !status && Object.keys(table.filters).length === 0;
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<{ sub: SubscriptionView; kind: 'payment' | 'refund' } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const pause = useMutation({
    mutationFn: setPaused,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MONEY_KEY }),
  });
  const pauseMutate = pause.mutate;
  const columns = useMemo(
    () =>
      subscriptionColumns({
        onPay: (sub, kind) => setPaying({ sub, kind }),
        onPause: (s, paused) => pauseMutate({ id: s.id, paused }),
        onOpen: onOpenStudent,
      }),
    [pauseMutate, onOpenStudent],
  );
  const saved = (message: string) => () => {
    setCreating(false);
    setPaying(null);
    setToast(message);
  };

  return (
    <>
      <PageHead>
        <Cartouche>{t.subscriptions.title}</Cartouche>
        <div className="ms-auto">
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" />
            {t.subscriptions.new}
          </Button>
        </div>
      </PageHead>
      {(list.isError || pause.isError) && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <ListSkeleton />}
      {bare && <TableBox center><EmptyState title={t.subscriptions.emptyList} /></TableBox>}
      {list.data && !bare && (
        <>
          <DataTable
            fill
            stacked
            columns={columns}
            data={list.data.items}
            getRowId={(r) => r.id}
            emptyText={t.subscriptions.emptyList}
            sort={{ key: table.sort.sort, dir: table.sort.dir, onChange: (next) => reset(toSortSearch(next)) }}
            filters={{ values: filterValues, onChange: (key, v) => reset(toFilterSearch(key, v)) }}
            toolbar={{ extra, total: list.isPlaceholderData ? undefined : list.data?.total }}
          />
          <Pager page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onPage={(p) => onSearch({ page: p > 1 ? p : undefined })} />
        </>
      )}
      <OpenTasks />
      {creating && <CreateSubscriptionDialog onClose={() => setCreating(false)} onSaved={saved(t.subscriptions.saved)} />}
      {paying && (
        <RecordPaymentDialog subscription={paying.sub} kind={paying.kind} onClose={() => setPaying(null)} onSaved={saved(t.payments.saved)} />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
