import type { SubscriptionPricing } from '@ab/money';
import { FormAlert, t } from '@ab/web-kit';
import { FxNote } from '@/features/finance/pricing';
import { durationLabel, packageCopy, sessionsOf } from '@/features/finance/pricing';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { apiErrorText } from '@/features/finance/subscriptions/format';
import { useSubscriptionQuote } from './use-subscription-quote';

interface Props {
  studentId: string;
  pricing: SubscriptionPricing;
}

/**
 * The price the package will be stored with: POST /subscriptions/quote, the same quote as the
 * create (guardian country, catalog, fx). Shown, never typed (subscriptions.priceHint).
 */
export function QuotePreview({ studentId, pricing }: Props) {
  const quote = useSubscriptionQuote(studentId, pricing);

  if (quote.isError)
    return <FormAlert>{apiErrorText(quote.error, t.subscriptions.error)}</FormAlert>;
  const q = quote.data;
  return (
    <figure
      aria-live="polite"
      aria-busy={quote.isFetching}
      className="grid gap-1.5 border-y border-rule py-3.5"
    >
      <figcaption className="text-xs text-ink-3">{t.subscriptions.price}</figcaption>
      {q ? (
        <>
          <p className="font-display text-[28px] font-bold leading-tight text-ink">
            <Amount amount={q.afterDiscount} currency={q.currency} />
          </p>
          <p className="text-sm text-ink-2">
            {packageCopy(q.package).name} · {sessionsOf(q)} · {durationLabel(q.duration)}
          </p>
          {q.fx && <FxNote fx={q.fx} />}
        </>
      ) : (
        <p className="text-sm text-ink-3">{t.common.loading}</p>
      )}
      <p className="text-xs text-ink-3">{t.subscriptions.priceHint}</p>
    </figure>
  );
}
