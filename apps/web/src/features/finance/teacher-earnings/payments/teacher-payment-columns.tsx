import { PAYMENT_METHODS, type TeacherPaymentView } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Button } from '@/components/ui/form/button';
import { formatDate } from '@/features/sales/leads/format';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { t } from '@/lib/i18n/i18n';

const col = createColumnHelper<DataTableFeatures, TeacherPaymentView>();

export type TeacherPaymentAction = 'receipt' | 'void';
type Options = { admin: boolean; onAction: (p: TeacherPaymentView, action: TeacherPaymentAction) => void };

const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: t.enums.paymentMethod[m] }));
const voidedOptions = [
  { value: 'false', label: t.finance.notVoided },
  { value: 'true', label: t.finance.voidedColumn },
];

/**
 * Payments made to the teacher: date, amount, voided (with the reason), method, sessions, note,
 * actions. Server sort (R-NFR-08) on date, amount and method; filters: voided, method, note. The
 * session count is read from the payment's items, so it does not sort.
 */
export function teacherPaymentColumns({ admin, onAction }: Options) {
  return col.columns([
    col.accessor('paid_at', {
      header: () => t.finance.paidOn,
      cell: (c) => <span className="tabular-nums text-ink-2">{formatDate(c.getValue())}</span>,
      meta: { className: 'max-sm:order-1', sortKey: 'paid_at' },
    }),
    col.accessor('amount', {
      header: () => t.earnings.amount,
      cell: (c) => <Amount amount={c.getValue()} currency="EGP" className={c.row.original.voided_at ? 'text-ink-3 line-through' : 'font-semibold'} />,
      meta: { className: 'max-sm:order-2', sortKey: 'amount' },
    }),
    col.accessor('voided_at', {
      header: () => t.finance.voidedColumn,
      cell: (c) => (c.getValue() ? <span className="text-xs text-danger">{t.finance.voided.replace('{reason}', c.row.original.void_reason ?? '')}</span> : null),
      meta: { className: 'max-sm:order-3 whitespace-normal', filterKey: 'voided', filter: { kind: 'select', options: voidedOptions } },
    }),
    col.accessor('method', {
      header: () => t.payments.method,
      cell: (c) => <span className="text-sm text-ink-2">{t.enums.paymentMethod[c.getValue()]}</span>,
      meta: { className: 'max-sm:order-4', sortKey: 'method', filter: { kind: 'select', options: methodOptions } },
    }),
    col.accessor('sessions', {
      header: () => t.earnings.sessions,
      cell: (c) => (
        <span className="text-xs text-ink-3">
          {c.row.original.payout_id ? t.earnings.fromPayout : t.earnings.paymentSessions.replace('{count}', String(c.getValue()))}
        </span>
      ),
      meta: { className: 'max-sm:order-5' },
    }),
    col.accessor((p) => p.note ?? '', {
      id: 'note',
      header: () => t.expenses.note,
      cell: (c) => <span className="text-xs text-ink-3">{c.getValue()}</span>,
      meta: { className: 'max-sm:order-6 max-sm:basis-full whitespace-normal', filter: { kind: 'text' } },
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: (c) => {
        const p = c.row.original;
        return (
          <span className="flex gap-1.5">
            {p.has_receipt && (
              <Button type="button" variant="secondary" size="sm" onClick={() => onAction(p, 'receipt')}>
                {t.earnings.viewReceipt}
              </Button>
            )}
            {admin && !p.voided_at && (
              <Button type="button" variant="danger-quiet" size="sm" onClick={() => onAction(p, 'void')}>
                {t.finance.voidPayment}
              </Button>
            )}
          </span>
        );
      },
      meta: { className: 'w-px max-sm:order-7 max-sm:ms-auto' },
    }),
  ]);
}
