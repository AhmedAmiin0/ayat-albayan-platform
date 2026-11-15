import type { SubscriptionPricing } from '@ab/shared';
import { FormAlert } from '@/components/ui/form/form-alert';
import { durationLabel, packageCopy, sessionsOf } from '@/features/finance/pricing/format';
import { Amount } from '@/features/finance/subscriptions/balance/Amount';
import { t } from '@/lib/i18n/i18n';
import type { Bind } from '@/features/sales/sales-money/api';
import { salesErrorText } from '@/features/sales/sales-money/errors';
import { useSalesQuote } from './use-sales-quote';

type Props = { studentId: string; pricing: SubscriptionPricing; bind?: Bind | undefined };

/**
 * «المبلغ المطلوب تحويله»: POST /sales/subscriptions/quote, the price the create will store, in the
 * family's currency. The admin's QuotePreview without the fx details; shown, never typed.
 */
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
