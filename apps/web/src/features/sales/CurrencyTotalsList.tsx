import type { CurrencyTotals } from '@ab/shared';
import { Amount } from '@/features/subscriptions/Amount';
import { t } from '@/lib/i18n/i18n';

const PARTS = ['salary', 'commissions', 'adjustments', 'total'] as const;

/**
 * The totals of a month, one block per currency (docs: amounts are never summed across currencies).
 * Zero adjustments or commissions still show, so the four lines always read the same way.
 */
export function CurrencyTotalsList({ totals, label }: { totals: Record<string, CurrencyTotals>; label: string }) {
  const currencies = Object.keys(totals).sort();
  if (currencies.length === 0) return <p className="text-sm text-ink-3">—</p>;
  return (
    <ul aria-label={label} className="grid gap-3">
      {currencies.map((currency) => {
        const row = totals[currency];
        if (!row) return null;
        return (
          <li key={currency} data-currency={currency}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-[repeat(4,minmax(0,12rem))]">
              {PARTS.map((part) => (
                <div key={part} className="grid gap-0.5">
                  <dt className="text-xs text-ink-3">{t.assistantPortal.earnings.totals[part]}</dt>
                  <dd className={part === 'total' ? 'font-bold' : 'text-ink-2'}>
                    <Amount amount={row[part]} currency={currency} />
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
