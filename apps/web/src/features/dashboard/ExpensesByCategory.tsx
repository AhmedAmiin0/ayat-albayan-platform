import { t } from '@/lib/i18n';
import { Bar } from './Bar';
import { amount } from './format';

const seeded = t.enums.expenseCategory as Record<string, string>;

/** R-RPT-02 expenses by category (keys of expense_categories), the categories with spend only, largest first. */
export function ExpensesByCategory({ byCategory }: { byCategory: Record<string, number> }) {
  const rows = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return <p className="text-sm text-ink-2">{t.dashboard.noExpenses}</p>;
  const max = Math.max(...rows.map(([, v]) => v));
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
        {rows.map(([c, v]) => (
          <tr key={c} className="border-b border-rule last:border-b-0">
            <th scope="row" className="w-0 py-2 pe-3 text-start font-semibold whitespace-nowrap">{seeded[c] ?? c}</th>
            <td className="py-2">
              <span className="flex items-center gap-2">
                <Bar value={v} max={max} />
                <bdi dir="ltr" className="min-w-14 text-end tabular-nums">{amount(v)}</bdi>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
