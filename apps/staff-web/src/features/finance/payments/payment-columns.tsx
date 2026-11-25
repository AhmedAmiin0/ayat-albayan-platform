import { PAYMENT_METHODS } from '@ab/catalog';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { Button, Ltr, t } from '@ab/web-kit';
import { formatDate } from '@/features/sales/leads';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { moneyText } from '@/features/finance/subscriptions';
import type { PaymentView } from './api';
import { amountEditable } from './amount/amount-check';

const col = createColumnHelper<DataTableFeatures, PaymentView>();

export type PaymentAction = 'receipt' | 'attachments' | 'amount' | 'edit' | 'delete';
/** Amount edits need payments.write, which PATCH /payments/:id requires. */
type Handlers = { onAction: (p: PaymentView, action: PaymentAction) => void; canWrite: boolean };

const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: t.enums.paymentMethod[m] }));

/** Server sort (R-PAY-01, R-NFR-08) on amount, method and date only. */
export function paymentColumns({ onAction, canWrite }: Handlers) {
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
      cell: (c) => {
        const p = c.row.original;
        const name = p.student.name;
        return (
          <div className="flex flex-wrap gap-1.5">
            {(p.receipt_path || p.invoice_id) && (
              <Button type="button" variant="secondary" size="sm" onClick={() => onAction(p, 'receipt')}>
                {t.payments.viewReceipt}
              </Button>
            )}
            {(p.method === 'bank' || p.receipt_path) && (
              <Button type="button" variant="secondary" size="sm" onClick={() => onAction(p, 'attachments')}>
                {t.payments.viewAttachments}
              </Button>
            )}
            {canWrite && amountEditable(p) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`${t.payments.editAmount.action} ${name}`}
                onClick={() => onAction(p, 'amount')}
              >
                {t.payments.editAmount.action}
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" aria-label={`${t.common.edit} ${name}`} onClick={() => onAction(p, 'edit')}>
              {t.common.edit}
            </Button>
            <Button type="button" variant="danger-quiet" size="sm" aria-label={`${t.common.delete} ${name}`} onClick={() => onAction(p, 'delete')}>
              {t.common.delete}
            </Button>
          </div>
        );
      },
      meta: { className: 'w-px max-sm:order-5' },
    }),
  ]);
}
