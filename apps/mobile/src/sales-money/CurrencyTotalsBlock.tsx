import type { CurrencyTotals } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { AmountText } from './AmountText';
import { byCurrency } from './money-text';

const PARTS = ['salary', 'commissions', 'adjustments', 'total'] as const;

/**
 * A month's totals, one block per currency (web CurrencyTotalsList): salary, commissions, adjustments
 * and the total; zero parts still show so the four lines always read the same way. Never summed across currencies.
 */
export function CurrencyTotalsBlock({ totals, label }: { totals: Readonly<Record<string, CurrencyTotals>>; label: string }) {
  const entries = byCurrency(totals);
  if (entries.length === 0) return <Note>—</Note>;
  return (
    <View accessibilityLabel={label} style={{ gap: 10 }}>
      {entries.map(([currency, row]) => (
        <View key={currency} testID={`totals-${currency}`} style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 }}>
          {PARTS.map((part) => (
            <View key={part} style={{ width: '50%', gap: 2 }}>
              <Note>{t.assistantPortal.earnings.totals[part]}</Note>
              <AmountText amount={row[part]} currency={currency} strong={part === 'total'} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
