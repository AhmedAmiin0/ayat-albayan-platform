import { PAYOUT_STATUSES } from '@ab/catalog';
import { payoutStatusStyle } from '@ab/money';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures, FilterOption } from '@/components/data-table/DataTable';
import { StatusChip, t, teacherLabel } from '@ab/web-kit';
import { formatDate } from '@/features/sales/leads';
import { LedgerPaid } from '@/features/finance/payouts/shared/LedgerPaid';
import { PayoutActions } from './PayoutActions';
import { Amount } from '@/features/finance/subscriptions';
import { durationLabel } from '@/features/finance/pricing';
import { moneyText } from '@/features/finance/subscriptions';
import type { PayoutView } from '@/features/finance/payouts/api';

const col = createColumnHelper<DataTableFeatures, PayoutView>();

export type PayoutAction = 'approve' | 'pay' | 'reopen' | 'unpay' | 'receipt';
interface Handlers {
  onAction: (p: PayoutView, action: PayoutAction) => void;
  teachers: FilterOption[];
}

/** Also used by the teacher's own statements. */
export const payoutStatusOptions: FilterOption[] = PAYOUT_STATUSES.map((s) => ({
  value: s,
  label: t.enums.payoutStatus[s],
}));

/** The breakdown stored at generate time. */
export function breakdownLines(p: PayoutView): string[] {
  return p.breakdown.lines.map(
    (l) =>
      `${durationLabel(l.duration)}: ${t.payouts.line
        .replace('{lessons}', String(l.lessons))
        .replace('{rate}', String(l.rate ?? 0))
        .replace('{amount}', moneyText(l.amount, 'EGP'))}`,
  );
}

/** Approved and paid payouts are frozen (R-PAY-02); client sort and filter on the whole month. */
export function payoutColumns({ onAction, teachers }: Handlers) {
  return col.columns([
    col.accessor((p) => teacherLabel(p.teacher), {
      id: 'teacher',
      header: () => t.payouts.teacher,
      cell: (c) => <span className="font-semibold text-ink">{c.getValue()}</span>,
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]', filter: { kind: 'select', options: teachers } },
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
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: (c) => {
        const p = c.row.original;
        return <PayoutActions payout={p} onAction={(a) => onAction(p, a)} />;
      },
      meta: { className: 'w-px max-sm:order-6' },
    }),
  ]);
}
