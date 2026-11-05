import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { shape, type, useTheme } from '@/theme';

interface AttachTileProps {
  /** The full name, for the screen reader («الردود السريعة»). */
  label: string;
  /** The word under the circle, one line («ردود سريعة»); the label when absent. */
  short?: string;
  onPress: () => void;
  children: ReactNode;
}

/**
 * One cell of the attach sheet's even three-column grid (WhatsApp's attach grid): a 56pt circle and
 * its word under it, one line at 12sp («…» only as a last resort).
 */
export function AttachTile({ label, short, onPress, children }: AttachTileProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: '33.333%',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 4,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: shape.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color.lapisWash,
        }}
      >
        {children}
      </View>
      <AppText
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          alignSelf: 'stretch',
          fontFamily: type.ui[500],
          fontSize: type.size['2xs'],
          lineHeight: type.lineHeight(type.size['2xs']),
          color: color.ink,
          textAlign: 'center',
        }}
      >
        {short ?? label}
      </AppText>
    </Pressable>
  );
}
