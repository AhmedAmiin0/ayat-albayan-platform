import type { ReactNode } from 'react';
import { Pressable, type ViewStyle } from 'react-native';
import { pressScale, raisedCard, useTheme } from '@ab/mobile-kit';

interface PressCardProps {
  /** What the reader hears for the whole card. */
  label: string;
  onPress: () => void;
  hint?: string;
  /** The card's own layout (gap, padding, direction). */
  style?: ViewStyle;
  children: ReactNode;
}

/**
 * A raised card that is one button (a child, a report, a lesson, an alert): the app's pressed state
 * (a lapis wash and a slight press-in) shows at once under the finger.
 */
export function PressCard({ label, onPress, hint, style, children }: PressCardProps) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => ({
        ...raisedCard(color, 16),
        backgroundColor: pressed ? color.lapisWash : color.raised,
        transform: [{ scale: pressScale(pressed, false) }],
        padding: 16,
        gap: 12,
        ...style,
      })}
    >
      {children}
    </Pressable>
  );
}
