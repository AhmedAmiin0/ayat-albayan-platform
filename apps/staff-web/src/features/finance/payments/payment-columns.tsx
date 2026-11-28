import { PAYMENT_METHODS } from '@ab/catalog';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { Ltr, RowMenu, t } from '@ab/web-kit';
import { formatDate } from '@/features/sales/leads';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { moneyText } from '@/features/finance/subscriptions';
import type { PaymentView } from './api';
import { paymentMenu, type PaymentMenuOptions } from './payment-menu';

const col = createColumnHelper<DataTableFeatures, PaymentView>();


const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: t.enums.paymentMethod[m] }));

/** Server sort (R-PAY-01, R-NFR-08) on amount, method and date only. */
export function paymentColumns({ onAction, canWrite }: PaymentMenuOptions) {
  return col.columns([
    col.accessor('student', {
      header: () => t.subscriptions.student,
      cell: (c) => (
        <div className="grid">
          <span className="font-semibold text-ink">{c.getValue().name}</span>
          <Ltr className="text-2xs text-ink-3">{c.getValue().code}</Ltr>
        </div>
      ),
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]' },
    }),
    col.accessor('amount', {
      header: () => t.payments.amount,
      cell: (c) => {
        const p = c.row.original;
        return (
          <div className="grid justify-items-start gap-0.5">
            {p.kind === 'refund' && <span className="text-2xs font-semibold text-danger">{t.enums.paymentKind.refund}</span>}
            <Amount amount={p.kind === 'refund' ? -p.amount : p.amount} currency={p.currency} className="font-semibold" />
            {p.original && (
              <span className="text-2xs text-ink-3">{t.finance.sentAs.replace('{amount}', moneyText(p.original.amount, p.original.currency))}</span>
            )}
          </div>
        );
      },
      meta: { className: 'max-sm:order-2', sortKey: 'amount' },
    }),
    col.accessor('method', {
      header: () => t.payments.method,
      cell: (c) => t.enums.paymentMethod[c.getValue()],
      meta: { className: 'max-sm:order-3 max-sm:text-xs', sortKey: 'method', filter: { kind: 'select', options: methodOptions } },
    }),
    col.accessor('paid_at', {
      header: () => t.payments.paidAt,
      cell: (c) => <span className="tabular-nums">{formatDate(c.getValue())}</span>,
      meta: { className: 'max-sm:order-4 max-sm:text-xs', sortKey: 'paid_at' },
    }),
    col.accessor('recorded_by', {
      header: () => t.payments.recordedByColumn,
      cell: (c) => c.getValue()?.full_name ?? '—',
      meta: { className: 'text-ink-2 max-sm:hidden' },
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: (c) => (
        <RowMenu
          label={t.common.rowActions.replace('{name}', c.row.original.student.name)}
          items={paymentMenu(c.row.original, { onAction, canWrite })}
        />
      ),
      meta: { className: 'w-px max-sm:order-5' },
    }),
  ]);
}
