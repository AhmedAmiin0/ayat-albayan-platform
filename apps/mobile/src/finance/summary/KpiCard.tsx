import { View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

interface KpiCardProps {
  label: string;
  /** Already formatted (amountText); «—» while it loads. */
  value: string;
  tone?: 'ink' | 'bad';
}

/** One number with its label; two sit side by side (half the row, never narrower than a thumb). */
export function KpiCard({ label, value, tone = 'ink' }: KpiCardProps) {
  const { color } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{ flexGrow: 1, flexBasis: '45%', gap: 4, padding: 12, borderRadius: shape.radius.lg, borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised }}
    >
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}>{label}</AppText>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.h3, color: tone === 'bad' ? color.bad : color.ink, fontVariant: ['tabular-nums'] }}>
        {value}
      </AppText>
    </View>
  );
}
