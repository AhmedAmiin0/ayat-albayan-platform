import { View } from 'react-native';
import { t, currencyName } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { AmountField } from '@/payments';
import type { CustomPrice } from './use-custom-price';

const c = t.subscriptions.customPrice;

/** Nothing while off or before a quote. */
export function CustomPriceField({ price }: { price: CustomPrice }) {
  const quote = price.quote;
  if (!price.on || !quote) return null;
  const currency = currencyName(quote.currency);
  const quoted = c.quoted
    .replace('{amount}', String(quote.afterDiscount))
    .replace('{currency}', currency);
  return (
    <View style={{ gap: 6 }}>
      <AmountField
        label={c.label.replace('{currency}', currency)}
        value={price.text}
        onChange={price.setText}
        currency={quote.currency}
        {...(price.error ? { error: price.error } : {})}
      />
      <Note>{quoted}</Note>
    </View>
  );
}
