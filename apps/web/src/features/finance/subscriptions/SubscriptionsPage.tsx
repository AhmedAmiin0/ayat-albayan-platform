import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { TableBox } from '@/components/TableBox';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Icon } from '@/components/ui/display/icon';
import { PageHead } from '@/components/ui/layout/page';
import { Pager } from '@/components/ui/layout/pager';
import { Toast } from '@/components/ui/overlay/toast';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { RecordPaymentDialog } from '@/features/finance/payments/record/RecordPaymentDialog';
import { usePermissions } from '@/features/people/auth';
import { CoursePauseDialogs, type CoursePauseTarget } from '@/features/teaching/course-pause';
import { t } from '@/lib/i18n/i18n';
import { toFilterSearch, toSortSearch } from '@/lib/list/list-search';
import { cancelSubscription, subscriptionsQuery, type SubscriptionView } from './api';
import { CancelPackageDialog } from './cancel/CancelPackageDialog';
import { CreateSubscriptionDialog } from './create/CreateSubscriptionDialog';
import { OpenTasks } from './balance/OpenTasks';
import { packageName, studentLabel } from './format';
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
  const { can } = usePermissions();
  const canPause = can('courses.pause');
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
  const [cancelling, setCancelling] = useState<SubscriptionView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [course, setCourse] = useState<CoursePauseTarget>(null);
  const columns = useMemo(
    () =>
      subscriptionColumns({
        onPay: (sub, kind) => setPaying({ sub, kind }),
        onPause: (s) => setCourse({ studentId: s.student.id, resume: false, subscriptionId: s.id }),
        onResume: (s) => setCourse({ studentId: s.student.id, resume: true, subscriptionId: s.id }),
        canPause,
        onCancel: setCancelling,
        onOpen: onOpenStudent,
      }),
    [canPause, onOpenStudent],
  );
  const saved = (message: string) => () => {
    setCreating(false);
    setPaying(null);
    setCancelling(null);
    setCourse(null);
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
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
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
      {cancelling && (
        <CancelPackageDialog
          label={`${packageName(cancelling)} · ${studentLabel(cancelling.student)}`}
          cancel={(body) => cancelSubscription(cancelling.id, body)}
          onClose={() => setCancelling(null)}
          onDone={saved(t.subscriptions.cancel.done)}
        />
      )}
      <CoursePauseDialogs target={course} onClose={() => setCourse(null)} onDone={(m) => saved(m)()} />
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
