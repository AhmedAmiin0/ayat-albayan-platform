import { Animated, Pressable } from 'react-native';
import { raisedCard, useTheme } from '@ab/mobile-kit';
import type { PressCardProps } from './PressCard.types';
import { usePressCard } from './use-press-card';

/**
 * A raised card that is one button (a child, a report, a lesson, an alert): the lapis wash shows at
 * once under the finger while the card eases in to 98 % on a spring and back out on release (the
 * staff app's press). A new touch takes over the running spring where it is, so a quick tap never
 * jumps. Reduce Motion: the wash alone, no scale.
 */
export function PressCard({ label, onPress, hint, style, children }: PressCardProps) {
  const { color } = useTheme();
  const { scale, press } = usePressCard();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        onPress={onPress}
        onPressIn={press(true)}
        onPressOut={press(false)}
        style={({ pressed }) => ({
          ...raisedCard(color, 16),
          backgroundColor: pressed ? color.lapisWash : color.raised,
          padding: 16,
          gap: 12,
          ...style,
        })}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
