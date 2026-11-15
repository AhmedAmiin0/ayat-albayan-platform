import { formatAmount } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { currencySymbol } from '@/features/finance/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import type { CustomPrice, QuotedPrice } from './use-custom-price';

const T = t.subscriptions.customPrice;

const labelOf = (q: QuotedPrice | undefined): string =>
  T.label.replace('{currency}', q ? currencySymbol(q.currency) : '');

const quotedLine = (q: QuotedPrice): string =>
  T.quoted
    .replace('{amount}', formatAmount(q.afterDiscount))
    .replace('{currency}', currencySymbol(q.currency));

/** «سعر الباقة (ر.س)»: only with «مبلغ مخصص» on; the quote's price is said under it. */
export function CustomPriceField({ price }: { price: CustomPrice }) {
  if (!price.on) return null;
  return (
    <Field
      label={labelOf(price.quote)}
      hint={price.quote && quotedLine(price.quote)}
      error={price.error ?? undefined}
    >
      {(p) => (
        // Text, not type=number: an Arabic keyboard types «١٤٥», which parseAmount reads.
        <Input
          {...p}
          type="text"
          inputMode="decimal"
          dir="ltr"
          className="max-w-[220px] tabular-nums"
          value={price.text}
          onChange={(e) => price.setText(e.target.value)}
        />
      )}
    </Field>
  );
}
