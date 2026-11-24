import type { CurrencyTotals } from '@ab/money';
import { View } from 'react-native';
import { t, money } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { AmountText } from '@/sales-money/components/AmountText';
import { byCurrency } from '@/sales-money/lib/money-text';

/** Per currency, as the statement froze them. */
export function StatementTotals({ totals }: { totals: Readonly<Record<string, CurrencyTotals>> }) {
  const entries = byCurrency(totals);
  if (entries.length === 0) return <Note>—</Note>;
  return (
    <View style={{ gap: 6 }}>
      {entries.map(([currency, v]) => (
        <View key={currency} testID={`statement-total-${currency}`} style={{ gap: 2 }}>
          <AmountText amount={v.total} currency={currency} strong />
          <Note>
            {t.assistants.statements.totalLine
              .replace('{salary}', money(v.salary, currency))
              .replace('{commissions}', money(v.commissions, currency))
              .replace('{adjustments}', money(v.adjustments, currency))
              .replace('{total}', money(v.total, currency))}
          </Note>
        </View>
      ))}
    </View>
  );
}
