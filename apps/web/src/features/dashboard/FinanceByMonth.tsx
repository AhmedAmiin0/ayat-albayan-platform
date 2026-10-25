import { ScrollX } from '@/components/ui/layout/scroll-x';
import { t } from '@/lib/i18n/i18n';
import { Bar } from './Bar';
import { amount, monthLabel } from './format';
import { useHandSort } from './hand-sort';
import { SortableTh } from './SortableTh';
import type { MonthFinance } from './types';

type Measure = 'revenue' | 'teacher_cost' | 'expenses';
const MEASURES: { key: Measure; label: string }[] = [
  { key: 'revenue', label: t.dashboard.revenue },
  { key: 'teacher_cost', label: t.dashboard.teacherCost },
  { key: 'expenses', label: t.dashboard.expenses },
];

type MonthKey = 'month' | Measure | 'gross_margin';
const valueOf = (m: MonthFinance, key: MonthKey): unknown => m[key];

/** One money cell: the bar on the shared scale, then the amount. */
function MoneyCell({ value, max }: { value: number; max: number }) {
  return (
    <td className="py-2 pe-3">
      <span className="flex items-center gap-2">
        <Bar value={value} max={max} />
        <bdi dir="ltr" className="min-w-14 text-end tabular-nums">{amount(value)}</bdi>
      </span>
    </td>
  );
}

/**
 * R-RPT-02 monthly revenue, teacher cost, expenses and gross margin, in the reporting currency.
 * Each measure is a column (identity by its header, not by colour) and all three bars share ONE
 * scale, so a month's bars compare honestly. The margin is a signed number, no bar. Every column
 * sorts (months chronologically by their YYYY-MM key); a short summary, so no filters.
 */
export function FinanceByMonth({ months, currency }: { months: readonly MonthFinance[]; currency: string }) {
  const sorter = useHandSort(months, valueOf);
  const max = Math.max(0, ...months.flatMap((m) => MEASURES.map((x) => m[x.key])));
  return (
    <ScrollX label={`${t.dashboard.byMonth} (${currency})`}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{`${t.dashboard.byMonth} (${currency})`}</caption>
        <thead>
          <tr className="border-b border-rule text-xs text-ink-3">
            <SortableTh label={t.dashboard.month} sortKey="month" sorter={sorter} className="text-start" />
            {MEASURES.map((x) => (
              <SortableTh key={x.key} label={x.label} sortKey={x.key} sorter={sorter} className="text-start" />
            ))}
            <SortableTh label={t.dashboard.grossMargin} sortKey="gross_margin" sorter={sorter} className="pe-0 text-end" />
          </tr>
        </thead>
        <tbody>
          {sorter.rows.map((m) => (
            <tr key={m.month} className="border-b border-rule last:border-b-0">
              <th scope="row" className="py-2 pe-3 text-start font-semibold whitespace-nowrap">{monthLabel(m.month)}</th>
              {MEASURES.map((x) => (
                <MoneyCell key={x.key} value={m[x.key]} max={max} />
              ))}
              <td className="py-2 text-end font-semibold tabular-nums">
                <bdi dir="ltr">{amount(m.gross_margin)}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollX>
  );
}
