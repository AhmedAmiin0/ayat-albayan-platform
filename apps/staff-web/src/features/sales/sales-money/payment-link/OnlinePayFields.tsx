import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { currencySymbol } from '@/features/finance/subscriptions';
import { fillText } from '@/features/sales/payment-links';
import { t } from '@/lib/i18n/i18n';
import { LinkQuote } from './LinkQuote';
import type { LinkPay } from './use-link-pay';

/**
 * «دفع إلكتروني»: the calculator price after the pill (the link's amount); with «مبلغ مخصص» on,
 * the amount box (the price by default) and the admin's lowest amount.
 */
export function OnlinePayFields({ pay }: { pay: LinkPay }) {
  const q = pay.quote.data;
  const error = pay.quote.error;
  const currency = q ? currencySymbol(q.quote.currency) : '';
  return (
    <>
      <LinkQuote quote={q} fetching={pay.quote.isFetching} error={error} custom={pay.custom} />
      {q && pay.custom && (
        <Field
          label={fillText(t.paymentLinks.agreedAmount, { currency })}
          {...(pay.amountError ? { error: pay.amountError } : {})}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              inputMode="decimal"
              dir="ltr"
              min={0}
              step="0.01"
              className="max-w-[220px] tabular-nums"
              value={pay.amount}
              onChange={(e) => pay.setAmount(e.target.value)}
            />
          )}
        </Field>
      )}
    </>
  );
}
