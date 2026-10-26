import type { SubscriptionPricing } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form/form-alert';
import { useDebounced } from '@/features/finance/pricing/use-debounced';
import { FxNote } from '@/features/finance/pricing/calculator/FxNote';
import { durationLabel, packageCopy, sessionsOf } from '@/features/finance/pricing/format';
import { t } from '@/lib/i18n/i18n';
import { Amount } from '../balance/Amount';
import { MONEY_KEY, quoteSubscription } from '../api';
import { apiErrorText } from '../format';

type Props = { studentId: string; pricing: SubscriptionPricing };

/**
 * The price the package will be stored with: POST /subscriptions/quote, the same quote as the
 * create (guardian country, catalog, fx). Shown, never typed (subscriptions.priceHint).
 */
export function QuotePreview({ studentId, pricing }: Props) {
  const settled = useDebounced(pricing, 300);
  const quote = useQuery({
    queryKey: [...MONEY_KEY, 'quote', studentId, settled],
    queryFn: () => quoteSubscription({ studentId, pricing: settled }),
  });

  if (quote.isError) return <FormAlert>{apiErrorText(quote.error, t.subscriptions.error)}</FormAlert>;
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
