import type { PaymentLinkQuoteView } from '@ab/shared';
import { FormAlert, t } from '@ab/web-kit';
import { fillText, moneySlots, paymentLinkErrorText } from '@/features/sales/payment-links';

interface Props {
  quote: PaymentLinkQuoteView | undefined;
  fetching: boolean;
  error: unknown;
  /** With a custom amount, the admin's lowest amount is shown too. */
  custom: boolean;
}

/** The calculator price is the reference the agreed amount starts from. */
export function LinkQuote({ quote, fetching, error, custom }: Props) {
  if (error) return <FormAlert>{paymentLinkErrorText(error)}</FormAlert>;
  return (
    <figure
      aria-live="polite"
      aria-busy={fetching}
      className="grid gap-1 border-y border-rule py-3"
    >
      {quote ? (
        <>
          <p className="text-sm font-semibold text-ink">
            {fillText(
              t.paymentLinks.referencePrice,
              moneySlots(quote.quote.afterDiscount, quote.quote.currency),
            )}
          </p>
          {custom && quote.min_amount !== null && (
            <p className="text-xs text-ink-3">
              {fillText(
                t.paymentLinks.minAmount,
                moneySlots(quote.min_amount, quote.quote.currency),
              )}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-ink-3">{t.common.loading}</p>
      )}
    </figure>
  );
}
