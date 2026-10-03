import type { TeacherBalance } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { egp } from './text';

function Card({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        gap: 4,
        padding: 12,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: strong ? color.lapis : color.rule,
        backgroundColor: color.raised,
      }}
    >
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}>{label}</AppText>
      <AppText
        style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </AppText>
    </View>
  );
}

/** Three balance cards: إجمالي المستحق / اتدفع / المتبقي (the outstanding one is outlined). */
export function BalanceCards({ balance }: { balance: TeacherBalance }) {
  const e = t.teacherEarnings;
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Card label={e.earned} value={egp(balance.earned)} />
      <Card label={e.paid} value={egp(balance.paid)} />
      <Card label={e.outstanding} value={egp(balance.outstanding)} strong />
    </View>
  );
}
