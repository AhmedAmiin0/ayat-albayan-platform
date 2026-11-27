import { View } from 'react-native';
import { AppText, type, useTheme } from '@ab/mobile-kit';
import type { DateTileProps } from './DateTile.types';

/** A day at the inline-start of a row: the weekday over its number. */
export function DateTile({ weekday, day, strong = false }: DateTileProps) {
  const { color } = useTheme();
  const ink = strong ? color.onLapis : color.coverInk;
  return (
    <View
      style={{
        width: 56,
        paddingVertical: 6,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: strong ? color.lapisFill : color.lapisWash,
      }}
    >
      <AppText style={{ fontSize: type.size['2xs'], color: ink }}>{weekday}</AppText>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.lg, color: ink }}>
        {day}
      </AppText>
    </View>
  );
}
