import { payoutStatusStyle, type PayoutView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable, type DataTableFeatures } from '@/components/DataTable';
import { Cartouche } from '@/components/ui/display/cartouche';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PageHead } from '@/components/ui/layout/page';
import { StatusChip } from '@/components/ui/display/status-chip';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { formatDate } from '@/features/sales/leads/format';
import { monthLabel } from '@/features/finance/payouts/MonthSelect';
import { breakdownLines, payoutStatusOptions } from '@/features/finance/payouts/payout-columns';
import { LedgerPaid } from '@/features/finance/payouts/LedgerPaid';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { t } from '@/lib/i18n/i18n';
import { myPayoutsQuery } from './api';

const col = createColumnHelper<DataTableFeatures, PayoutView>();

/** The admin's payout columns without approve / pay: month, lessons, breakdown, amount, status (sortable; status filters). */
const COLUMNS = col.columns([
  col.accessor('month', {
    header: () => t.payouts.month,
    cell: (c) => <span className="font-semibold text-ink">{monthLabel(c.getValue())}</span>,
    meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]' },
  }),
  col.accessor('lessons_count', {
    header: () => t.payouts.lessons,
    cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
    meta: { className: 'max-sm:order-3' },
  }),
  col.display({
    id: 'breakdown',
    header: () => t.payouts.breakdown,
    cell: (c) => (
      <ul className="grid text-xs text-ink-2">
        {breakdownLines(c.row.original).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    ),
    meta: { className: 'max-sm:order-5 max-sm:basis-full' },
  }),
  col.accessor('amount', {
    header: () => t.payouts.amount,
    cell: (c) => (
      <div className="grid justify-items-start gap-0.5">
        <Amount amount={c.getValue()} currency="EGP" className="font-semibold" />
        <LedgerPaid amount={c.row.original.ledger_paid} />
      </div>
    ),
    meta: { className: 'max-sm:order-4' },
  }),
  col.accessor('status', {
    header: () => t.subscriptions.status,
    cell: (c) => {
      const p = c.row.original;
      const when = p.paid_at ?? p.approved_at;
      return (
        <div className="grid justify-items-start gap-0.5">
          <StatusChip size="sm" {...payoutStatusStyle[p.status]} label={t.enums.payoutStatus[p.status]} />
          {when && <span className="text-2xs text-ink-3">{formatDate(when)}</span>}
        </div>
      );
    },
    meta: { className: 'max-sm:order-2', filter: { kind: 'select', options: payoutStatusOptions } },
  }),
]);

/** /teacher/payouts «كشوف الشهر» (R-TCH-04): every month calculated for me, newest first, in EGP; client sort + filter. */
export function MyPayouts() {
  const list = useQuery(myPayoutsQuery);
  return (
    <>
      <PageHead>
        <Cartouche>{t.teacherNav.statements}</Cartouche>
      </PageHead>
      {list.isPending && <ListSkeleton />}
      {list.isError && <FormAlert>{t.common.error}</FormAlert>}
      {list.data?.length === 0 && <EmptyState title={t.payouts.mineEmpty} />}
      {list.data && list.data.length > 0 && <DataTable stacked clientSort clientFilter columns={COLUMNS} data={list.data} getRowId={(r) => r.id} />}
    </>
  );
}
