import { SUBSCRIPTION_STATUSES } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';
import type { SalesSubscription } from '../api';

const col = createColumnHelper<DataTableFeatures, SalesSubscription>();
const STATUS: Record<string, string | undefined> = t.enums.subscriptionStatus;
const statusOptions = SUBSCRIPTION_STATUSES.map((s) => ({ value: s, label: t.enums.subscriptionStatus[s] }));

// «الاشتراكات» of a salesperson: the whole list is loaded, so it sorts and filters locally. Never a
// price or a payment. Stacked under 640px: student and code, then package · status · lessons, start.

export const salesSubscriptionColumns = col.columns([
  // «name code»: sorts by the name, and the search finds a name or a code.
  col.accessor((s) => `${s.student.name} ${s.student.code}`, {
    id: 'student',
    header: () => t.sales.subscriptions.student,
    cell: (c) => (
      <span className="inline-flex items-baseline gap-3">
        <span className="font-semibold">{c.row.original.student.name}</span>
        <Ltr className="text-sm text-ink-2">{c.row.original.student.code}</Ltr>
      </span>
    ),
    meta: { className: 'max-sm:order-1 max-sm:basis-full', filter: { kind: 'text' } },
  }),
  col.accessor('package', {
    header: () => t.sales.subscriptions.package,
    meta: { className: 'text-ink-2 max-sm:order-2 max-sm:text-sm', filter: { kind: 'text' } },
  }),
  col.accessor('status', {
    header: () => t.sales.subscriptions.status,
    cell: (c) => STATUS[c.getValue()] ?? c.getValue(),
    meta: { className: 'text-ink-2 max-sm:order-3 max-sm:text-sm', filter: { kind: 'select', options: statusOptions } },
  }),
  col.accessor('lessons_total', {
    header: () => t.sales.subscriptions.lessonsCol,
    cell: (c) => t.sales.subscriptions.lessons.replace('{n}', String(c.getValue())),
    meta: { className: 'text-ink-2 tabular-nums max-sm:order-4 max-sm:text-sm' },
  }),
  col.accessor('starts_on', {
    header: () => t.sales.subscriptions.startsCol,
    cell: (c) => {
      const on = c.getValue();
      return on ? <Ltr className="tabular-nums">{on}</Ltr> : '—';
    },
    meta: { className: 'text-xs text-ink-3 max-sm:order-5 max-sm:basis-full' },
  }),
]);
