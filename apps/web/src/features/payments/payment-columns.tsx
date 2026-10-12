import { PAYMENT_METHODS } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Ltr } from '@/components/ui/ltr';
import { formatDate } from '@/features/leads/format';
import { Amount } from '@/features/subscriptions/Amount';
import { moneyText } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';
import type { PaymentView } from './api';

const col = createColumnHelper<DataTableFeatures, PaymentView>();

export type PaymentAction = 'receipt' | 'attachments' | 'edit' | 'delete';
type Handlers = { onAction: (p: PaymentView, action: PaymentAction) => void };

const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: t.enums.paymentMethod[m] }));

/**
 * Payments list (R-PAY-01): student, amount (a refund in red, the amount sent in another currency),
 * method, date, who, actions («عرض المرفقات» for a bank payment or one with a receipt). Server sort (R-NFR-08) on amount, method and date; the student is
 * filtered by the bar's picker, «سجّلها» is a name read after the page (neither sorts server-side).
 */
export function paymentColumns({ onAction }: Handlers) {
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
