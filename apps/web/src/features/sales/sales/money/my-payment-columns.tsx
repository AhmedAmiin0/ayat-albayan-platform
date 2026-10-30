import { PAYMENT_KINDS, PAYMENT_METHODS, type MyPaymentRow } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/form/button';
import { formatDate } from '@/features/sales/leads/format';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { t } from '@/lib/i18n/i18n';
import { StudentCell } from './StudentCell';

const col = createColumnHelper<DataTableFeatures, MyPaymentRow>();
const kindOptions = PAYMENT_KINDS.map((k) => ({ value: k, label: t.enums.paymentKind[k] }));
const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: t.enums.paymentMethod[m] }));

type Handlers = { onAttachments: (p: MyPaymentRow) => void };

// «مدفوعاتي»: only what I recorded. Amount per row in its own currency (never a total across them), and
// «عرض المرفقات» (her transfer's files, GET /sales/me/payments/:id/attachments).
export const myPaymentColumns = ({ onAttachments }: Handlers) =>
  col.columns([
    col.accessor((p) => `${p.student.name} ${p.student.code}`, {
      id: 'student',
      header: () => t.assistantPortal.payments.student,
      cell: (c) => <StudentCell student={c.row.original.student} />,
      meta: { className: 'max-sm:order-1 max-sm:basis-full', filter: { kind: 'text' } },
    }),
    col.accessor('amount', {
      header: () => t.assistantPortal.payments.amount,
      cell: (c) => <Amount amount={c.getValue()} currency={c.row.original.currency} className="font-semibold" />,
      meta: { className: 'max-sm:order-2' },
    }),
    col.accessor('kind', {
      header: () => t.assistantPortal.payments.kind,
      cell: (c) => t.enums.paymentKind[c.getValue()],
      meta: { className: 'text-ink-2 max-sm:order-3 max-sm:text-sm', filter: { kind: 'select', options: kindOptions } },
    }),
    col.accessor('method', {
      header: () => t.assistantPortal.payments.method,
      cell: (c) => t.enums.paymentMethod[c.getValue()],
      meta: { className: 'text-ink-2 max-sm:order-4 max-sm:text-sm', filter: { kind: 'select', options: methodOptions } },
    }),
    col.accessor('paid_at', {
      header: () => t.assistantPortal.payments.paidAt,
      cell: (c) => <span className="tabular-nums">{formatDate(c.getValue())}</span>,
      meta: { className: 'text-xs text-ink-3 max-sm:order-5' },
    }),
    col.accessor((p) => p.note ?? '', {
      id: 'note',
      header: () => t.assistantPortal.payments.note,
      cell: (c) => c.getValue() || '—',
      meta: { className: 'text-xs text-ink-2 max-sm:order-6 max-sm:basis-full' },
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: (c) => (
        <Button type="button" variant="secondary" size="sm" aria-label={`${t.payments.viewAttachments} ${c.row.original.student.name}`} onClick={() => onAttachments(c.row.original)}>
          {t.payments.viewAttachments}
        </Button>
      ),
      meta: { className: 'w-px max-sm:order-7' },
    }),
  ]);
