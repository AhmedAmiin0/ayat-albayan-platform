import { Amount } from '@/features/subscriptions/balance/Amount';
import { t } from '@/lib/i18n/i18n';
import type { PeriodTotal } from './api';

/** The filter's totals per currency: net (payments − refunds), and the refunds when there are any. */
export function PeriodTotals({ totals }: { totals: readonly PeriodTotal[] }) {
  if (totals.length === 0) return null;
  return (
    <p className="mb-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm" aria-label={t.finance.periodTotal}>
      <span className="text-ink-3">{t.finance.periodTotal}</span>
      {totals.map((x) => (
        <span key={x.currency} className="flex items-baseline gap-1.5">
          <Amount amount={x.net} currency={x.currency} className="font-semibold" />
          {x.refunds > 0 && (
            <span className="text-xs text-ink-3">
              ({t.enums.paymentKind.refund}: <Amount amount={x.refunds} currency={x.currency} />)
            </span>
          )}
        </span>
      ))}
    </p>
  );
}
