import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { ListSkeleton } from '@/components/ui/skeleton';
import { MONEY_KEY } from '@/features/subscriptions/api';
import { Amount } from '@/features/subscriptions/Amount';
import { apiErrorText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import {
  approvePayout,
  currentMonth,
  downloadPayoutsCsv,
  generatePayouts,
  payoutsQuery,
  payPayout,
  type PayoutGenerateResult,
} from './api';
import { MissingRates } from './MissingRates';
import { MonthSelect } from './MonthSelect';
import { payoutColumns } from './payout-columns';

type Props = { month: string; onMonth: (month: string) => void };

/** /admin/payouts (R-PAY-02, R-TCH-04, E3): a month's drafts, approve, mark paid, CSV. */
export function PayoutsPage({ month, onMonth }: Props) {
  const queryClient = useQueryClient();
  const list = useQuery(payoutsQuery(month));
  const [missing, setMissing] = useState<PayoutGenerateResult['missing_rates']>([]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: MONEY_KEY });
  const generate = useMutation({
    mutationFn: generatePayouts,
    onSuccess: async (r) => {
      setMissing(r.missing_rates);
      await refresh();
    },
  });
  const move = useMutation({
    mutationFn: ({ id, to }: { id: string; to: 'approve' | 'pay' }) => (to === 'approve' ? approvePayout(id) : payPayout(id)),
    onSuccess: refresh,
  });
  const csv = useMutation({ mutationFn: downloadPayoutsCsv });
  const moveMutate = move.mutate;
  const columns = useMemo(
    () =>
      payoutColumns({
        onApprove: (p) => moveMutate({ id: p.id, to: 'approve' }),
        onPay: (p) => moveMutate({ id: p.id, to: 'pay' }),
      }),
    [moveMutate],
  );
  const rows = list.data ?? [];
  const total = rows.reduce((n, p) => n + p.amount, 0);
  const error = generate.error ?? move.error;

  return (
    <>
      <PageHead>
        <Cartouche>{t.payouts.title}</Cartouche>
        <MonthSelect label={t.payouts.month} value={month} latest={currentMonth()} onChange={onMonth} />
        <div className="ms-auto flex flex-wrap gap-2.5">
          <Button type="button" variant="secondary" disabled={rows.length === 0 || csv.isPending} onClick={() => csv.mutate(month)}>
            {t.payouts.exportCsv}
          </Button>
          <Button type="button" disabled={generate.isPending} onClick={() => generate.mutate(month)}>
            {rows.length > 0 ? t.payouts.regenerate : t.payouts.generate}
          </Button>
        </div>
      </PageHead>
      {error && <FormAlert>{apiErrorText(error, t.payouts.error)}</FormAlert>}
      {csv.isError && <FormAlert>{t.common.error}</FormAlert>}
      <MissingRates items={missing} />
      {list.isPending && <ListSkeleton />}
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.isSuccess && rows.length === 0 && <EmptyState title={t.payouts.empty} />}
      {rows.length > 0 && (
        <>
          <DataTable stacked columns={columns} data={rows} getRowId={(r) => r.id} />
          <p className="mt-3 flex justify-end gap-2 text-sm">
            <span className="text-ink-3">{t.expenses.total}</span>
            <Amount amount={total} currency="EGP" className="font-semibold" />
          </p>
        </>
      )}
    </>
  );
}
