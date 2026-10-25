import { Pressable, View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import type { Kpi } from './kpis';

/** One number with its label; saffron when work is waiting. A tile with a work list is a button. */
export function KpiTile({
  kpi,
  selected,
  onPress,
}: {
  kpi: Kpi;
  selected: boolean;
  onPress?: () => void;
}) {
  const { color } = useTheme();
  const body = (
    <View style={{ gap: 4 }}>
      <AppText
        style={{
          fontFamily: type.ui[700],
          fontSize: type.size.h2,
          lineHeight: type.lineHeight(type.size.h2),
          color: kpi.act ? color.act : color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {String(kpi.value)}
      </AppText>
      <AppText
        numberOfLines={2}
        style={{
          fontFamily: type.ui[500],
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs),
          color: color.ink2,
        }}
      >
        {kpi.label}
      </AppText>
    </View>
  );
  const box = {
    flexBasis: '47%' as const,
    flexGrow: 1,
    minHeight: 88,
    padding: 12,
    borderRadius: shape.radius.md,
    borderWidth: selected ? 2 : 1,
    borderColor: selected ? color.lapis : color.rule,
    backgroundColor: color.raised,
  };
  if (!onPress) return <View style={box}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${kpi.label}: ${kpi.value}`}
      onPress={onPress}
      style={box}
    >
      {body}
    </Pressable>
  );
}
