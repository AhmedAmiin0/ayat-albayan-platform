import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { StatusChip } from '@/components/ui/status-chip';
import { formatDate } from '@/features/leads/format';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';
import type { TeacherEarningView } from './api';
import { teacherEarningStatusStyle } from './earning-style';
import { isOpen } from './selection';

const col = createColumnHelper<DataTableFeatures, TeacherEarningView>();
const tt = t.teacherEarnings;
const box = 'size-5 cursor-pointer accent-[var(--lapis)] sm:size-4';

/** Present only when the table is selectable (admin); the teacher's copy has no checkboxes. */
export type Selection = {
  selected: ReadonlySet<string>;
  allSelected: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
};

const money = (key: 'rate' | 'amount' | 'paid' | 'outstanding', className: string, bold = false) =>
  col.accessor(key, {
    header: () => ({ rate: tt.rate, amount: tt.amount, paid: tt.paidCol, outstanding: tt.outstandingCol })[key],
    cell: (c) => <Amount amount={c.getValue()} currency={c.row.original.currency} className={bold ? 'font-semibold' : undefined} />,
    meta: { className },
  });

/** One row per session: date, minutes, rate, amount, paid, outstanding, status (+ a tick when open and selectable). */
export function earningColumns(selection?: Selection) {
  const pick = selection
    ? [
        col.display({
          id: 'pick',
          header: () => (
            <input type="checkbox" className={box} aria-label={tt.selectAll} checked={selection.allSelected} onChange={selection.onToggleAll} />
          ),
          cell: (c) =>
            isOpen(c.row.original) ? (
              <input
                type="checkbox"
                className={box}
                aria-label={`${tt.selectRow} ${formatDate(c.row.original.starts_at)}`}
                checked={selection.selected.has(c.row.original.id)}
                onChange={() => selection.onToggle(c.row.original.id)}
              />
            ) : null,
          meta: { className: 'w-px max-sm:order-0', headClassName: 'w-px' },
        }),
      ]
    : [];
  return col.columns([
    ...pick,
    col.accessor('starts_at', {
      header: () => tt.date,
      cell: (c) => <span className="font-semibold text-ink">{formatDate(c.getValue())}</span>,
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_50%]' },
    }),
    col.accessor('minutes', {
      header: () => t.subscriptions.duration,
      cell: (c) => <span className="tabular-nums">{tt.minutes.replace('{n}', String(c.getValue()))}</span>,
      meta: { className: 'max-sm:order-3' },
    }),
    money('rate', 'max-sm:order-4 text-ink-2'),
    money('amount', 'max-sm:order-5', true),
    money('paid', 'max-sm:order-6'),
    money('outstanding', 'max-sm:order-7', true),
    col.accessor('status', {
      header: () => t.subscriptions.status,
      cell: (c) => <StatusChip size="sm" {...teacherEarningStatusStyle[c.getValue()]} label={tt.status[c.getValue()]} />,
      meta: { className: 'max-sm:order-2' },
    }),
  ]);
}
