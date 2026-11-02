import { t } from '@/core/lib/i18n/i18n';
import { AmountField, currencyName } from '@/payments';
import { fill } from '@/sales';
import { LinkPriceSection } from './LinkPriceSection';
import type { LinkPay } from './use-link-pay';

/**
 * «دفع إلكتروني»: the calculator price after the pill (the link's amount); with «مبلغ مخصص» on, the amount field
 * (the price by default) and the admin's lowest amount.
 */
export function OnlinePrice({ pay }: { pay: LinkPay }) {
  const currency = pay.priced?.quote.currency;
  return (
    <>
      <LinkPriceSection quote={pay.quote} custom={pay.custom} />
      {currency && pay.custom ? (
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
