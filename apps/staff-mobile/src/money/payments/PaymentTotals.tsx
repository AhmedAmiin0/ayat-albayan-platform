import { View } from 'react-native';
import { t, shape, type, useTheme, AppText, money } from '@ab/mobile-kit';
import type { PeriodTotal } from '@ab/money';

/**
 * The filter's net per currency (payments minus refunds), and the refunds when there are any: a list's
 * header inside the gutter (one container rule; the list puts 12pt under it).
 */
export function PaymentTotals({ totals }: { totals: readonly PeriodTotal[] }) {
  const { color } = useTheme();
  if (totals.length === 0) return null;
  const small = { fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2, fontVariant: ['tabular-nums' as const] };
  return (
    <View
      accessibilityLabel={t.mobileMoney.periodTotal}
      style={{ gap: 2, padding: 12, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised }}
    >
      <AppText style={small}>{t.mobileMoney.periodTotal}</AppText>
      {totals.map((x) => (
        <View key={x.currency} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8 }}>
          <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: color.ink, fontVariant: ['tabular-nums'] }}>
            {money(x.net, x.currency)}
          </AppText>
          {x.refunds > 0 ? (
            <AppText style={small}>{t.mobileMoney.refundsOf.replace('{amount}', money(x.refunds, x.currency))}</AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}
