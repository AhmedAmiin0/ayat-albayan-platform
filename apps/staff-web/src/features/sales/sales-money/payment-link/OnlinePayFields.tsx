import { Field, Input, t } from '@ab/web-kit';
import { currencySymbol } from '@/features/finance/subscriptions';
import { fillText } from '@/features/sales/payment-links';
import { LinkQuote } from './LinkQuote';
import type { LinkPay } from './use-link-pay';

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
