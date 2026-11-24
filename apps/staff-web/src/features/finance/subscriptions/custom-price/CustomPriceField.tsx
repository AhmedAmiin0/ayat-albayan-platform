import { formatAmount } from '@ab/money';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { currencySymbol } from '@/features/finance/subscriptions/format';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { QuotedPrice } from '@ab/client-core';
import type { CustomPrice } from './use-custom-price';

const T = t.subscriptions.customPrice;

const labelOf = (q: QuotedPrice | undefined): string =>
  T.label.replace('{currency}', q ? currencySymbol(q.currency) : '');

const quotedLine = (q: QuotedPrice): string =>
  T.quoted
    .replace('{amount}', formatAmount(q.afterDiscount))
    .replace('{currency}', currencySymbol(q.currency));

/** Only with the custom amount on. */
export function CustomPriceField({ price }: { price: CustomPrice }) {
  if (!price.on) return null;
  return (
    <Field
      label={labelOf(price.quote)}
      hint={price.quote && quotedLine(price.quote)}
      error={price.error ?? undefined}
    >
      {(p) => (
        // Text, not type=number, so Arabic-Indic digits typed on an Arabic keyboard still parse.
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
