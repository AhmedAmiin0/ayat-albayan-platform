import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form-alert';
import { monthLabel } from '@/features/payouts/MonthSelect';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n';
import { categoriesQuery, categoryLabel, expenseYearQuery } from './api';

/**
 * The 12-month table (owner, 2026-10-05): each month's confirmed expenses per category, converted
 * to the reporting currency with the stored rates; a currency without a rate is named, not guessed.
 */
export function ExpenseYearTable({ year }: { year: string }) {
  const q = useQuery(expenseYearQuery(year));
  const categories = useQuery(categoriesQuery);
  if (q.isError) return <FormAlert>{t.common.error}</FormAlert>;
  if (!q.data) return <p className="py-6 text-center text-ink-3">{t.common.loading}</p>;
  const v = q.data;
  return (
    <div className="grid gap-3">
      {v.fx_missing.length > 0 && <FormAlert>{t.finance.fxMissing.replace('{currencies}', v.fx_missing.join('، '))}</FormAlert>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="mb-2 text-start text-xs text-ink-3">{t.finance.convertedTo.replace('{currency}', v.currency)}</caption>
          <thead>
            <tr className="border-b border-rule-strong text-start">
              <th scope="col" className="py-2 pe-3 text-start">{t.expenses.month}</th>
              {v.categories.map((c) => (
                <th key={c} scope="col" className="px-2 py-2 text-start whitespace-nowrap">
                  {categoryLabel(categories.data, c)}
                </th>
              ))}
              <th scope="col" className="ps-3 py-2 text-start">{t.expenses.total}</th>
            </tr>
          </thead>
          <tbody>
            {v.months.map((m) => (
              <tr key={m.month} className="border-b border-rule">
                <th scope="row" className="py-2 pe-3 text-start font-semibold whitespace-nowrap">{monthLabel(m.month)}</th>
                {v.categories.map((c) => (
                  <td key={c} className="px-2 py-2 tabular-nums">
                    {m.by_category[c] ? <Amount amount={m.by_category[c] ?? 0} currency={v.currency} /> : '—'}
                  </td>
                ))}
                <td className="ps-3 py-2 font-semibold">
                  <Amount amount={m.total} currency={v.currency} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-[3px] border-double border-gold">
              <th scope="row" className="py-2 pe-3 text-start">{t.expenses.total}</th>
              <td colSpan={v.categories.length} />
              <td className="ps-3 py-2 font-semibold">
                <Amount amount={v.total} currency={v.currency} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
