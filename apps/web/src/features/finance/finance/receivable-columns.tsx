import { AGING_BUCKETS, type ReceivableRow } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { t } from '@/lib/i18n/i18n';

const col = createColumnHelper<DataTableFeatures, ReceivableRow>();

const bucketOptions = AGING_BUCKETS.map((b) => ({ value: b, label: t.finance.aging[b] }));

/**
 * «مستحق على الطلاب» (client sort + filter: the whole list is loaded): student, guardian, owed,
 * paid of price, days late, aging. Names filter by text, the aging by its bucket.
 */
export const receivableColumns = col.columns([
  col.accessor((r) => r.student.name, {
    id: 'student',
    header: () => t.subscriptions.student,
    cell: (c) => (
      <Link to="/admin/students/$studentId" params={{ studentId: c.row.original.student.id }} className="font-semibold text-ink hover:underline">
        {c.getValue()}
      </Link>
    ),
    meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]', filter: { kind: 'text' } },
  }),
  col.accessor((r) => r.guardian?.name ?? '', {
    id: 'guardian',
    header: () => t.finance.guardian,
    cell: (c) => <span className="text-ink-3">{c.getValue()}</span>,
    meta: { className: 'max-sm:order-3 max-sm:text-xs', filter: { kind: 'text' } },
  }),
  col.accessor('owed', {
    header: () => t.finance.owed,
    cell: (c) => <Amount amount={c.getValue()} currency={c.row.original.currency} className="font-semibold" />,
    meta: { className: 'max-sm:order-2' },
  }),
  col.accessor('paid', {
    header: () => t.finance.paid,
    cell: (c) => (
      <span className="text-ink-3">
        {t.payments.paidOf.replace('{paid}', String(c.getValue())).replace('{price}', String(c.row.original.price))}
      </span>
    ),
    meta: { className: 'max-sm:order-4 max-sm:text-xs' },
  }),
  col.accessor('days_overdue', {
    header: () => t.finance.daysOverdue,
    cell: (c) => (
      <span className={c.getValue() > 60 ? 'font-semibold text-act' : 'text-ink-2'}>
        {t.finance.daysLate.replace('{count}', String(c.getValue()))}
      </span>
    ),
    meta: { className: 'max-sm:order-5 max-sm:text-xs' },
  }),
  col.accessor('bucket', {
    header: () => t.finance.agingBucket,
    cell: (c) => <span className="text-ink-2">{t.finance.aging[c.getValue()]}</span>,
    meta: { className: 'max-sm:order-6 max-sm:text-xs', filter: { kind: 'select', options: bucketOptions } },
  }),
]);
