import type { ExpenseYearView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { DataTable, type DataTableFeatures } from '@/components/DataTable';
import { FormAlert } from '@/components/ui/form-alert';
import { monthLabel } from '@/features/payouts/MonthSelect';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';
import { categoriesQuery, categoryLabel, expenseYearQuery } from './api';

type Month = ExpenseYearView['months'][number];
const col = createColumnHelper<DataTableFeatures, Month>();

/** Month, one column per category, the month's total: every column sorts (e.g. the dearest month first). */
function yearColumns(input: { categories: string[]; label: (key: string) => string; currency: string }) {
  const money = (v: number) => (v ? <Amount amount={v} currency={input.currency} /> : '—');
  return col.columns([
    col.accessor('month', {
      header: () => t.expenses.month,
      cell: (c) => <span className="font-semibold">{monthLabel(c.getValue())}</span>,
    }),
    ...input.categories.map((c) =>
      col.accessor((m) => m.by_category[c] ?? 0, {
        id: `cat:${c}`,
        header: () => input.label(c),
        cell: (v) => <span className="tabular-nums">{money(v.getValue())}</span>,
      }),
    ),
    col.accessor('total', {
      header: () => t.expenses.total,
      cell: (c) => <Amount amount={c.getValue()} currency={input.currency} />,
      meta: { className: 'font-semibold' },
    }),
  ]);
}

/**
 * The 12-month table (owner, 2026-10-05): each month's confirmed expenses per category, converted
 * to the reporting currency with the stored rates; a currency without a rate is named, not guessed.
 * Sortable by any column (client: the year is loaded whole); twelve fixed months need no filter.
 */
export function ExpenseYearTable({ year }: { year: string }) {
  const q = useQuery(expenseYearQuery(year));
  const categories = useQuery(categoriesQuery);
  const v = q.data;
  const columns = useMemo(
    () => yearColumns({ categories: v?.categories ?? [], label: (c) => categoryLabel(categories.data, c), currency: v?.currency ?? '' }),
    [v, categories.data],
  );
  if (q.isError) return <FormAlert>{t.common.error}</FormAlert>;
  if (!v) return <p className="py-6 text-center text-ink-3">{t.common.loading}</p>;
  return (
    <div className="grid gap-3">
      {v.fx_missing.length > 0 && <FormAlert>{t.finance.fxMissing.replace('{currencies}', v.fx_missing.join('، '))}</FormAlert>}
      <p className="text-xs text-ink-3">{t.finance.convertedTo.replace('{currency}', v.currency)}</p>
      <DataTable clientSort columns={columns} data={v.months} getRowId={(m) => m.month} />
      <p className="flex justify-end gap-2 border-t-[3px] border-double border-gold pt-2 text-sm">
        <span className="text-ink-3">{t.expenses.total}</span>
        <Amount amount={v.total} currency={v.currency} className="font-semibold" />
      </p>
    </div>
  );
}
