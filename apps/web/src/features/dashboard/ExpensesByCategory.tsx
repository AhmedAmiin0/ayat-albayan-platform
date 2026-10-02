import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@ab/shared';
import { t } from '@/lib/i18n';
import { Bar } from './Bar';
import { amount } from './format';

/** R-RPT-02 expenses by category (ads / content / tools …), the categories with spend only. */
export function ExpensesByCategory({ byCategory }: { byCategory: Record<ExpenseCategory, number> }) {
  const rows = EXPENSE_CATEGORIES.filter((c) => byCategory[c] > 0);
  if (rows.length === 0) return <p className="text-sm text-ink-2">{t.dashboard.noExpenses}</p>;
  const max = Math.max(...rows.map((c) => byCategory[c]));
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{t.dashboard.expensesByCategory}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{t.expenses.category}</th>
          <th scope="col">{t.expenses.amount}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c} className="border-b border-rule last:border-b-0">
            <th scope="row" className="w-0 py-2 pe-3 text-start font-semibold whitespace-nowrap">{t.enums.expenseCategory[c]}</th>
            <td className="py-2">
              <span className="flex items-center gap-2">
                <Bar value={byCategory[c]} max={max} />
                <bdi dir="ltr" className="min-w-14 text-end tabular-nums">{amount(byCategory[c])}</bdi>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
