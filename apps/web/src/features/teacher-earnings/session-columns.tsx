import { earningStatusStyle, type TeacherEarningView } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import { createContext, useContext } from 'react';
import type { DataTableFeatures } from '@/components/DataTable';
import { StatusChip } from '@/components/ui/display/status-chip';
import { formatDateTime } from '@/features/leads/format';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';

const col = createColumnHelper<DataTableFeatures, TeacherEarningView>();

export type Pick = {
  selected: ReadonlyMap<string, TeacherEarningView>;
  onToggle: (row: TeacherEarningView) => void;
  rows: readonly TeacherEarningView[];
  onToggleAll: (rows: readonly TeacherEarningView[], on: boolean) => void;
};

/**
 * The ticks live in a context, not in the column definitions: new column functions on every tick
 * would remount the cells and drop the keyboard focus from the checkbox that was just pressed.
 */
export const PickContext = createContext<Pick | null>(null);

const payable = (rows: readonly TeacherEarningView[]) => rows.filter((r) => r.outstanding > 0);

const Box = (props: { label: string; checked: boolean; disabled?: boolean; onChange: (on: boolean) => void }) => (
  <input
    type="checkbox"
    aria-label={props.label}
    checked={props.checked}
    disabled={props.disabled}
    onChange={(e) => props.onChange(e.target.checked)}
    className="size-5 accent-(--lapis)"
  />
);

function TickAll() {
  const pick = useContext(PickContext);
  if (!pick) return null;
  const open = payable(pick.rows);
  const all = open.length > 0 && open.every((r) => pick.selected.has(r.id));
  return <Box label={t.earnings.selectAll} checked={all} disabled={open.length === 0} onChange={(on) => pick.onToggleAll(open, on)} />;
}

function TickRow({ row }: { row: TeacherEarningView }) {
  const pick = useContext(PickContext);
  if (!pick) return null;
  const label = t.earnings.selectRow.replace('{date}', formatDateTime(row.starts_at));
  return <Box label={label} checked={pick.selected.has(row.id)} disabled={row.outstanding <= 0} onChange={() => pick.onToggle(row)} />;
}

const pickColumn = col.display({
  id: 'pick',
  header: () => <TickAll />,
  cell: (c) => <TickRow row={c.row.original} />,
  meta: { className: 'w-px max-sm:order-0' },
});

/**
 * Sessions: date, students, length, amount, paid, outstanding, status (+ ticks for the admin).
 * Server sort (R-NFR-08) on date, length, amount, paid and status; the status filter is the
 * panel's segmented control. Students (read after the page) and outstanding (amount − paid) are
 * derived, so they do not sort server-side.
 */
export function sessionColumns(selectable: boolean) {
  const body = col.columns([
    col.accessor('starts_at', {
      header: () => t.earnings.date,
      cell: (c) => <span className="font-semibold tabular-nums text-ink">{formatDateTime(c.getValue())}</span>,
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]', sortKey: 'starts_at' },
    }),
    col.accessor('students', {
      header: () => t.earnings.students,
      cell: (c) => c.getValue().join(t.common.listSeparator) || '—',
      meta: { className: 'text-ink-2 max-sm:order-3 max-sm:basis-full max-sm:text-xs' },
    }),
    col.accessor('minutes', {
      header: () => t.earnings.duration,
      cell: (c) => <span className="tabular-nums">{t.earnings.minutes.replace('{count}', String(c.getValue()))}</span>,
      meta: { className: 'max-sm:order-4 max-sm:text-xs', sortKey: 'minutes' },
    }),
    col.accessor('amount', {
      header: () => t.earnings.amount,
      cell: (c) => <Amount amount={c.getValue()} currency="EGP" />,
      meta: { className: 'max-sm:order-5', sortKey: 'amount' },
    }),
    col.accessor('paid_amount', {
      header: () => t.earnings.paidAmount,
      cell: (c) => <Amount amount={c.getValue()} currency="EGP" />,
      meta: { className: 'max-sm:hidden', sortKey: 'paid_amount' },
    }),
    col.accessor('outstanding', {
      header: () => t.earnings.left,
      cell: (c) => <Amount amount={c.getValue()} currency="EGP" className="font-semibold" />,
      meta: { className: 'max-sm:order-6' },
    }),
    col.accessor('status', {
      header: () => t.earnings.status,
      cell: (c) => <StatusChip size="sm" {...earningStatusStyle[c.getValue()]} label={t.earnings.statusName[c.getValue()]} />,
      meta: { className: 'max-sm:order-2', sortKey: 'status' },
    }),
  ]);
  return selectable ? [pickColumn, ...body] : body;
}
