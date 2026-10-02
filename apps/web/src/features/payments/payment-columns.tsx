import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Ltr } from '@/components/ui/ltr';
import { formatDate } from '@/features/leads/format';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';
import type { PaymentView } from './api';

const col = createColumnHelper<DataTableFeatures, PaymentView>();

/** Payments list (R-PAY-01): student, amount, method, date, who recorded it, the receipt. */
export function paymentColumns({ onReceipt }: { onReceipt: (p: PaymentView) => void }) {
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
      cell: (c) => <Amount amount={c.getValue()} currency={c.row.original.currency} className="font-semibold" />,
      meta: { className: 'max-sm:order-2' },
    }),
    col.accessor('method', {
      header: () => t.payments.method,
      cell: (c) => t.enums.paymentMethod[c.getValue()],
      meta: { className: 'max-sm:order-3 max-sm:text-xs' },
    }),
    col.accessor('paid_at', {
      header: () => t.payments.paidAt,
      cell: (c) => <span className="tabular-nums">{formatDate(c.getValue())}</span>,
      meta: { className: 'max-sm:order-4 max-sm:text-xs' },
    }),
    col.accessor('recorded_by', {
      header: () => t.payments.recordedByColumn,
      cell: (c) => c.getValue()?.full_name ?? '—',
      meta: { className: 'text-ink-2 max-sm:hidden' },
    }),
    col.display({
      id: 'receipt',
      header: () => t.payments.receipt,
      cell: (c) =>
        c.row.original.receipt_path ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => onReceipt(c.row.original)}>
            {t.payments.viewReceipt}
          </Button>
        ) : (
          <span className="text-ink-3">—</span>
        ),
      meta: { className: 'w-px max-sm:order-5' },
    }),
  ]);
}
