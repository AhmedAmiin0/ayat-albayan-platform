import { View } from 'react-native';
import { AppText, type, useTheme } from '@ab/mobile-kit';
import type { FigureTone, FigureProps } from './Figure.types';

/** One number over its word in a sunk tile (this month's attended / absent, what is due). */
export function Figure({ value, label, tone }: FigureProps) {
  const { color } = useTheme();
  const ink: Record<FigureTone, string> = {
    ok: color.ok,
    bad: color.bad,
    act: color.act,
    ink: color.ink,
  };
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 10,
        backgroundColor: tone === 'act' ? color.actSoft : color.sunk,
      }}
    >
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: ink[tone] }}>
        {value}
      </AppText>
      <AppText numberOfLines={1} style={{ fontSize: type.size['2xs'], color: color.ink3 }}>
        {label}
      </AppText>
    </View>
  );
}
