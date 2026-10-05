import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from '@ab/shared';
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
import { Select } from '@/components/ui/select';
import { Toast } from '@/components/ui/toast';
import { ListSkeleton } from '@/components/ui/skeleton';
import { RecordPaymentDialog } from '@/features/payments/RecordPaymentDialog';
import { t } from '@/lib/i18n';
import { MONEY_KEY, setPaused, subscriptionsQuery, type SubscriptionView } from './api';
import { CreateSubscriptionDialog } from './CreateSubscriptionDialog';
import { OpenTasks } from './OpenTasks';
import { subscriptionColumns } from './subscription-columns';

export type SubscriptionsSearch = { status?: SubscriptionStatus; page: number };
type Props = SubscriptionsSearch & {
  onChange: (next: SubscriptionsSearch) => void;
  onOpenStudent: (studentId: string) => void;
};

/** /admin/subscriptions (R-SUB-01/02): packages by status, new from the calculator, pay, tasks. */
export function SubscriptionsPage({ status, page, onChange, onOpenStudent }: Props) {
  const queryClient = useQueryClient();
  const list = useQuery(subscriptionsQuery({ status, page }));
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState<SubscriptionView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const pause = useMutation({
    mutationFn: setPaused,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MONEY_KEY }),
  });
  const pauseMutate = pause.mutate;
  const columns = useMemo(
    () =>
      subscriptionColumns({
        onPay: setPaying,
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
        <Select
          aria-label={t.subscriptions.status}
          className="w-auto"
          value={status ?? ''}
          onChange={(e) => onChange({ status: (e.target.value || undefined) as SubscriptionStatus | undefined, page: 1 })}
        >
          <option value="">{t.subscriptions.allStatuses}</option>
          {SUBSCRIPTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.enums.subscriptionStatus[s]}
            </option>
          ))}
        </Select>
        <div className="ms-auto">
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" />
            {t.subscriptions.new}
          </Button>
        </div>
      </PageHead>
      {(list.isError || pause.isError) && <FormAlert>{t.common.error}</FormAlert>}
      {list.isPending && <ListSkeleton />}
      {list.data?.total === 0 && <TableBox center><EmptyState title={t.subscriptions.emptyList} /></TableBox>}
      {list.data && list.data.total > 0 && (
        <>
          <DataTable fill stacked columns={columns} data={list.data.items} getRowId={(r) => r.id} />
          <Pager page={list.data.page} total={list.data.total} pageSize={list.data.pageSize} onPage={(p) => onChange({ status, page: p })} />
        </>
      )}
      <OpenTasks />
      {creating && <CreateSubscriptionDialog onClose={() => setCreating(false)} onSaved={saved(t.subscriptions.saved)} />}
      {paying && <RecordPaymentDialog subscription={paying} onClose={() => setPaying(null)} onSaved={saved(t.payments.saved)} />}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
