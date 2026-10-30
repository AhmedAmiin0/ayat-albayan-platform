import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table/DataTable';
import { TableBox } from '@/components/data-table/TableBox';
import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { downloadCsv } from '@/features/reporting/exports/api';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { MONEY_KEY } from '@/features/finance/subscriptions/api';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { apiErrorText } from '@/features/finance/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import {
  approvePayout,
  currentMonth,
  downloadPayoutsCsv,
  generatePayouts,
  payoutReceiptUrl,
  payoutsQuery,
  type PayoutGenerateResult,
} from '../api';
import { MissingRates } from './MissingRates';
import { MonthSelect } from '../shared/MonthSelect';
import { payoutColumns } from './payout-columns';
import { PayoutDialogs, type PayoutDialog } from '../pay/PayoutDialogs';
import { TeacherDuesSummary } from './TeacherDuesSummary';

type Props = { month: string; onMonth: (month: string) => void };

/** /admin/payouts (R-PAY-02, R-TCH-04, E3): what every teacher is owed, then a month's drafts, approve, pay, correct, CSV. */
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
  const move = useMutation({ mutationFn: approvePayout, onSuccess: refresh });
  const receipt = useMutation({
    mutationFn: payoutReceiptUrl,
    onSuccess: (r) => void window.open(r.url, '_blank', 'noopener'),
  });
  const [dialog, setDialog] = useState<PayoutDialog | null>(null);
  const csv = useMutation({ mutationFn: downloadPayoutsCsv });
  const ledger = useMutation({ mutationFn: () => downloadCsv({ kind: 'teacher-ledger', params: { month } }) });
  const [approve, openReceipt] = [move.mutate, receipt.mutate];
  const rows = useMemo(() => list.data ?? [], [list.data]);
  const columns = useMemo(
    () =>
      payoutColumns({
        teachers: [...new Set(rows.map((p) => p.teacher.display_name_ar))].map((n) => ({ value: n, label: n })),
        onAction: (p, action) => {
          if (action === 'approve') approve(p.id);
          else if (action === 'receipt') openReceipt(p.id);
          else setDialog({ payout: p, kind: action });
        },
      }),
    [rows, approve, openReceipt],
  );
  const total = rows.reduce((n, p) => n + p.amount, 0);
  const error = generate.error ?? move.error ?? receipt.error;

  return (
    <>
      <TeacherDuesSummary />
      <PageHead>
        <Cartouche>{t.payouts.title}</Cartouche>
        <MonthSelect label={t.payouts.month} value={month} latest={currentMonth()} onChange={onMonth} />
        <div className="ms-auto flex flex-wrap gap-2.5">
          <Button type="button" variant="secondary" disabled={rows.length === 0 || csv.isPending} onClick={() => csv.mutate(month)}>
            {t.payouts.exportCsv}
          </Button>
          <Button type="button" variant="secondary" disabled={ledger.isPending} onClick={() => ledger.mutate()}>
            {t.finance.ledgerCsv}
          </Button>
          <Button type="button" disabled={generate.isPending} onClick={() => generate.mutate(month)}>
            {rows.length > 0 ? t.payouts.regenerate : t.payouts.generate}
          </Button>
        </div>
      </PageHead>
      {error && <FormAlert>{apiErrorText(error, { ...t.payouts.error, ...t.earnings.error })}</FormAlert>}
      {dialog && <PayoutDialogs open={dialog} onClose={() => setDialog(null)} />}
      {(csv.isError || ledger.isError) && <FormAlert>{t.common.error}</FormAlert>}
      <MissingRates items={missing} />
      {list.isPending && <ListSkeleton />}
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.isSuccess && rows.length === 0 && <TableBox center><EmptyState title={t.payouts.empty} /></TableBox>}
      {rows.length > 0 && (
        <>
          <DataTable fill stacked clientSort clientFilter columns={columns} data={rows} getRowId={(r) => r.id} />
          <p className="mt-3 flex justify-end gap-2 text-sm">
            <span className="text-ink-3">{t.expenses.total}</span>
            <Amount amount={total} currency="EGP" className="font-semibold" />
          </p>
        </>
      )}
    </>
  );
}
