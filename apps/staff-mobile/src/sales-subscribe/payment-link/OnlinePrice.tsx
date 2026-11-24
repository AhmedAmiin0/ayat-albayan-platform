import { t, currencyName } from '@ab/mobile-kit';
import { AmountField } from '@/payments';
import { fill } from '@/sales/sales';
import { LinkPriceSection } from './LinkPriceSection';
import type { LinkPay } from './use-link-pay';

/** With a custom amount on, the field defaults to the price and shows the admin's minimum. */
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
