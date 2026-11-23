import type { TeacherEarningsBalanceView } from '@ab/money';
import { View } from 'react-native';
import { t, shape, type, useTheme, AppText } from '@ab/mobile-kit';
import { egp } from '@/earnings/lib/format';

function Card({ label, amount, strong }: { label: string; amount: number; strong?: boolean }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        gap: 4,
        padding: 10,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: strong ? color.gold : color.rule,
        backgroundColor: color.raised,
      }}
    >
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink3 }}>{label}</AppText>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink, fontVariant: ['tabular-nums'] }}>
        {egp(amount)}
      </AppText>
    </View>
  );
}

/** Also shows what was paid above a corrected lesson, if anything. */
export function EarningsSummary({ balance }: { balance: TeacherEarningsBalanceView }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View accessibilityRole="summary" style={{ flexDirection: 'row', gap: 8 }}>
        <Card label={t.earnings.earned} amount={balance.earned} />
        <Card label={t.earnings.paid} amount={balance.paid} />
        <Card strong label={t.earnings.outstanding} amount={balance.outstanding} />
      </View>
      {balance.overpaid > 0 ? (
        <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink3 }}>
          {t.earnings.overpaid.replace('{amount}', egp(balance.overpaid))}
        </AppText>
      ) : null}
    </View>
  );
}
