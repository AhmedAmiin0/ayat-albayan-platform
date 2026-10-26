import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures, FilterOption } from '@/components/DataTable';
import { Amount } from '@/features/subscriptions/balance/Amount';
import { t } from '@/lib/i18n/i18n';
import type { ExpenseView } from './api';
import { ExpenseActions, type ExpenseAction } from './ExpenseActions';

const col = createColumnHelper<DataTableFeatures, ExpenseView>();

type Options = {
  /** Category key → its label (the categories table, else the seeded names). */
  label: (key: string) => string;
  /** The «البند» filter: the labels of the month's rows. */
  categories: FilterOption[];
  onAction: (e: ExpenseView, action: ExpenseAction) => void;
};

const stateOptions: FilterOption[] = [
  { value: 'draft', label: t.finance.draftMark },
  { value: 'confirmed', label: t.finance.confirmed },
];

/**
 * A month's expenses (client sort + filter: the month is loaded whole): category, amount, state
 * (a monthly draft / repeats), paid day, vendor, note, actions.
 */
export function expenseColumns({ label, categories, onAction }: Options) {
  return col.columns([
    col.accessor((e) => label(e.category), {
      id: 'category',
      header: () => t.expenses.category,
      cell: (c) => <span className="font-semibold text-ink">{c.getValue()}</span>,
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_50%]', filter: { kind: 'select', options: categories } },
    }),
    col.accessor('amount', {
      header: () => t.expenses.amount,
      cell: (c) => <Amount amount={c.getValue()} currency={c.row.original.currency} className={c.row.original.is_draft ? 'text-ink-3' : undefined} />,
      meta: { className: 'max-sm:order-2' },
    }),
    col.accessor((e) => (e.is_draft ? 'draft' : 'confirmed'), {
      id: 'state',
      header: () => t.finance.status,
      cell: (c) => {
        const e = c.row.original;
        if (e.is_draft) return <span className="text-2xs font-semibold text-act">{t.finance.draftMark}</span>;
        return e.recurring ? <span className="text-2xs text-ink-3">{t.finance.recurring}</span> : null;
      },
      meta: { className: 'max-sm:order-3', filter: { kind: 'select', options: stateOptions } },
    }),
    col.accessor('paid_on', {
      header: () => t.finance.paidOn,
      cell: (c) => <span className="tabular-nums text-ink-2">{c.getValue() ?? '—'}</span>,
      meta: { className: 'max-sm:order-4 max-sm:text-xs' },
    }),
    col.accessor((e) => e.vendor ?? '', {
      id: 'vendor',
      header: () => t.finance.vendor,
      cell: (c) => <span className="text-ink-2">{c.getValue()}</span>,
      meta: { className: 'max-sm:order-5 max-sm:text-xs', filter: { kind: 'text' } },
    }),
    col.accessor((e) => e.note ?? '', {
      id: 'note',
      header: () => t.expenses.note,
      cell: (c) => <span className="text-ink-2">{c.getValue()}</span>,
      meta: { className: 'max-sm:order-6 max-sm:basis-full max-sm:text-xs whitespace-normal', filter: { kind: 'text' } },
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: (c) => <ExpenseActions expense={c.row.original} onAction={onAction} />,
      meta: { className: 'w-px max-sm:order-7 max-sm:ms-auto' },
    }),
  ]);
}
