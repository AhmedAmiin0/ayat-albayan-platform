import type { CurrencyTotals } from '@ab/shared';
import { moneyText } from '@/features/finance/subscriptions/format';
import { t } from '@/lib/i18n/i18n';

/** The totals a statement froze: one line per currency, «الراتب + العمولات + التسويات = الإجمالي». Never mixed. */
export function StatementTotals({ totals }: { totals: Readonly<Record<string, CurrencyTotals>> }) {
  const entries = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <span className="text-ink-3">—</span>;
  return (
    <ul className="grid gap-1">
      {entries.map(([currency, v]) => (
        <li key={currency} className="grid">
          <span className="font-semibold tabular-nums">{moneyText(v.total, currency)}</span>
          <span className="text-2xs text-ink-3">
            {t.assistants.statements.totalLine
              .replace('{salary}', moneyText(v.salary, currency))
              .replace('{commissions}', moneyText(v.commissions, currency))
              .replace('{adjustments}', moneyText(v.adjustments, currency))
              .replace('{total}', moneyText(v.total, currency))}
          </span>
        </li>
      ))}
    </ul>
  );
}
