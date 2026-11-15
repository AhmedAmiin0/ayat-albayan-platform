import type { PaymentLinkQuoteView } from '@ab/shared';
import { FormAlert } from '@/components/ui/form/form-alert';
import { fillText, moneySlots, paymentLinkErrorText } from '@/features/sales/payment-links';
import { t } from '@/lib/i18n/i18n';

type Props = {
  quote: PaymentLinkQuoteView | undefined;
  fetching: boolean;
  error: unknown;
  /** «مبلغ مخصص» on: the admin's lowest amount is said too. */
  custom: boolean;
};

/** «سعر الحاسبة» (the reference the agreed amount starts from) and, with the admin's cap, the lowest amount allowed. */
export function LinkQuote({ quote, fetching, error, custom }: Props) {
  if (error) return <FormAlert>{paymentLinkErrorText(error)}</FormAlert>;
  return (
    <figure aria-live="polite" aria-busy={fetching} className="grid gap-1 border-y border-rule py-3">
      {quote ? (
        <>
          <p className="text-sm font-semibold text-ink">{fillText(t.paymentLinks.referencePrice, moneySlots(quote.quote.afterDiscount, quote.quote.currency))}</p>
          {custom && quote.min_amount !== null && (
            <p className="text-xs text-ink-3">{fillText(t.paymentLinks.minAmount, moneySlots(quote.min_amount, quote.quote.currency))}</p>
          )}
        </>
      ) : (
        <p className="text-sm text-ink-3">{t.common.loading}</p>
      )}
    </figure>
  );
}
