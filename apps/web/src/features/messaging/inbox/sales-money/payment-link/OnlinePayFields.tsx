import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { currencySymbol } from '@/features/finance/subscriptions';
import { fillText } from '@/features/sales/payment-links';
import { t } from '@/lib/i18n/i18n';
import { LinkQuote } from './LinkQuote';
import type { LinkPay } from './use-link-pay';

/** «دفع إلكتروني»: the calculator price as the reference, then the agreed amount (the reference by default). */
export function OnlinePayFields({ pay }: { pay: LinkPay }) {
  const q = pay.quote.data;
  return (
    <>
      <LinkQuote quote={q} fetching={pay.quote.isFetching} error={pay.quote.error} />
      {q && (
        <Field
          label={fillText(t.paymentLinks.agreedAmount, { currency: currencySymbol(q.quote.currency) })}
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
