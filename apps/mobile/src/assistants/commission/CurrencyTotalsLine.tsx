import { View } from 'react-native';
import { Note } from '@/core/ui/feedback/Note';
import { AmountText } from '@/sales-money/components/AmountText';
import { byCurrency } from '@/sales-money/lib/money-text';

/** «إجمالي العمولات المستحقة»: one amount per currency, one line each (web CurrencyList). Never summed across them. */
export function CurrencyTotalsLine({ label, totals }: { label: string; totals: Readonly<Record<string, number>> }) {
  const entries = byCurrency(totals);
  return (
    <View accessibilityLabel={label} style={{ gap: 4, paddingVertical: 8 }}>
      <Note>{label}</Note>
      {entries.length === 0 ? <Note>—</Note> : null}
      {entries.map(([currency, amount]) => (
        <View key={currency} testID={`total-${currency}`}>
          <AmountText amount={amount} currency={currency} strong />
        </View>
      ))}
    </View>
  );
}
