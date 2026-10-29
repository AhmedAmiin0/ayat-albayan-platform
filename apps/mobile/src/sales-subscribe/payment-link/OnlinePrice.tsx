import { t } from '@/core/lib/i18n/i18n';
import { AmountField, currencyName } from '@/payments';
import { fill } from '@/sales';
import { LinkPriceSection } from './LinkPriceSection';
import type { LinkPay } from './use-link-pay';

/** «دفع إلكتروني»: the calculator price as the reference, then the agreed amount (the reference by default). */
export function OnlinePrice({ pay }: { pay: LinkPay }) {
  const currency = pay.priced?.quote.currency;
  return (
    <>
      <LinkPriceSection quote={pay.quote} />
      {currency ? (
        <AmountField
          label={fill(t.paymentLinks.agreedAmount, { currency: currencyName(currency) })}
          value={pay.amountText}
          onChange={pay.setAmount}
          currency={currency}
          {...(pay.amountError ? { error: pay.amountError } : {})}
        />
      ) : null}
    </>
  );
}
