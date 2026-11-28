import type { SubscriptionPricing } from '@ab/money';
import { FormAlert, t } from '@ab/web-kit';
import { durationLabel, packageCopy, sessionsOf } from '@/features/finance/pricing';
import { Amount } from '@/features/finance/subscriptions';
import type { Bind } from '@/features/sales/sales-money/api';
import { salesErrorText } from '@/features/sales/sales-money/errors';
import { useSalesQuote } from './use-sales-quote';

interface Props { studentId: string; pricing: SubscriptionPricing; bind?: Bind | undefined }

/** The price the create will store, in the family's currency; shown, never typed. */
export function SalesQuotePreview({ studentId, pricing, bind }: Props) {
  const quote = useSalesQuote({ studentId, pricing, bind });

  if (quote.isError) return <FormAlert>{salesErrorText(quote.error)}</FormAlert>;
  const q = quote.data;
  return (
    <figure aria-live="polite" aria-busy={quote.isFetching} className="grid gap-1.5 border-y border-rule py-3.5">
      <figcaption className="text-xs text-ink-3">{t.salesMoney.price}</figcaption>
      {q ? (
        <>
          <p className="font-display text-[28px] font-bold leading-tight text-ink">
            <Amount amount={q.afterDiscount} currency={q.currency} />
          </p>
          <p className="text-sm text-ink-2">
            {packageCopy(q.package).name} · {sessionsOf(q)} · {durationLabel(q.duration)}
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-3">{t.common.loading}</p>
      )}
      <p className="text-xs text-ink-3">{t.salesMoney.priceHint}</p>
    </figure>
  );
}
