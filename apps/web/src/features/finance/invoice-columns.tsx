import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/features/leads/format';
import { t } from '@/lib/i18n';
import type { InvoiceView } from './api';

const col = createColumnHelper<DataTableFeatures, InvoiceView>();

export type InvoiceAction = 'open' | 'record';
type Handlers = { onAction: (invoice: InvoiceView, action: InvoiceAction) => void };

const kindLabel = (kind: InvoiceView['kind']) => (kind === 'makeup' ? t.finance.invoiceMakeup : t.finance.invoicePackage);
const kindOptions = (['package', 'makeup'] as const).map((k) => ({ value: k, label: kindLabel(k) }));

/**
 * Booking invoices (R-PAY-03): date, students, kind, recorded mark, actions. Server sort
 * (R-NFR-08) on the date and kind; filters: a student's name and the kind. The students of a
 * group booking and the recorded mark come from other tables, so they do not sort.
 */
export function invoiceColumns({ onAction }: Handlers) {
  return col.columns([
    col.accessor('created_at', {
      header: () => t.finance.invoiceDate,
      cell: (c) => <span className="tabular-nums text-ink-2">{formatDate(c.getValue())}</span>,
      meta: { className: 'max-sm:order-2 max-sm:text-xs', sortKey: 'created_at' },
    }),
    col.accessor((i) => i.students.map((s) => s.name).join(t.common.listSeparator), {
      id: 'student',
      header: () => t.finance.invoiceStudents,
      cell: (c) => <span className="font-semibold text-ink">{c.getValue() || '—'}</span>,
      meta: { className: 'max-sm:order-1 max-sm:basis-full', filter: { kind: 'text' } },
    }),
    col.accessor('kind', {
      header: () => t.finance.kind,
      cell: (c) => <span className="text-xs text-ink-3">{kindLabel(c.getValue())}</span>,
      meta: { className: 'max-sm:order-3', sortKey: 'kind', filter: { kind: 'select', options: kindOptions } },
    }),
    col.accessor('payment_id', {
      header: () => t.finance.invoicePayment,
      cell: (c) => (c.getValue() ? <span className="text-xs font-semibold text-ink-2">{t.finance.invoicePaid}</span> : null),
      meta: { className: 'max-sm:order-4' },
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: (c) => {
        const i = c.row.original;
        return (
          <span className="flex gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={() => onAction(i, 'open')}>
              {t.finance.openInvoice}
            </Button>
            {!i.payment_id && i.students.length > 0 && (
              <Button type="button" variant="secondary" size="sm" onClick={() => onAction(i, 'record')}>
                {t.finance.recordFromInvoice}
              </Button>
            )}
          </span>
        );
      },
      meta: { className: 'w-px max-sm:order-5 max-sm:ms-auto' },
    }),
  ]);
}
