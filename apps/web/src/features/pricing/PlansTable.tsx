import type { Quote } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable, type DataTableFeatures } from '@/components/DataTable';
import { t } from '@/lib/i18n';
import { durationLabel, frequencyOf, packageCopy, sessionsOf } from './format';
import { Money } from './Money';

const col = createColumnHelper<DataTableFeatures, Quote>();

/** «المدة» filter: the site's lesson lengths. */
const durationOptions = Object.keys(t.pricing.durations).map((m) => ({ value: m, label: durationLabel(Number(m)) }));

// Stacked under 640px: plan name, then lessons · duration, then the two prices.
const columns = col.columns([
  // The value is the plan's name, so it sorts and filters by what the row shows.
  col.accessor((q) => packageCopy(q.package).name, {
    id: 'package',
    header: () => t.pricing.planColumn,
    cell: (c) => (
      <div className="grid">
        <span className="font-semibold text-ink">{c.getValue()}</span>
        <span className="text-2xs text-ink-3">{frequencyOf(c.row.original.package)}</span>
      </div>
    ),
    meta: { className: 'max-sm:order-1 max-sm:basis-full', filter: { kind: 'text' } },
  }),
  col.accessor('lessons', {
    header: () => t.pricing.customCount,
    cell: (c) => sessionsOf(c.row.original),
    meta: { className: 'text-ink-2 max-sm:order-2 max-sm:text-xs' },
  }),
  col.accessor('duration', {
    header: () => t.pricing.steps.duration,
    cell: (c) => durationLabel(c.getValue()),
    meta: {
      className: 'text-ink-2 max-sm:order-3 max-sm:text-xs',
      filter: { kind: 'select', options: durationOptions },
    },
  }),
  col.accessor('price', {
    header: () => t.pricing.packagePrice,
    cell: (c) => <Money amount={c.getValue()} currency={c.row.original.currency} />,
    meta: { className: 'font-semibold max-sm:order-4 max-sm:ms-auto' },
  }),
  col.accessor('perLesson', {
    header: () => t.pricing.perCircleLabel,
    cell: (c) => <Money amount={c.getValue()} currency={c.row.original.currency} />,
    meta: { className: 'text-ink-2 max-sm:order-5 max-sm:text-xs' },
  }),
]);

/** «أسعار كل الخطط» for the picked country and duration (GET /pricing/catalog); sortable, filterable. */
export function PlansTable({ packages }: { packages: Quote[] }) {
  return <DataTable stacked clientSort clientFilter columns={columns} data={packages} getRowId={(q) => q.package} />;
}
