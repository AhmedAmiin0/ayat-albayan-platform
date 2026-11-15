import { useState, type ReactNode } from 'react';
import { Animated, Pressable, type ViewStyle } from 'react-native';
import { criticalSpring, pressScale, raisedCard, useA11yPref, useTheme } from '@ab/mobile-kit';

/** Quick enough to follow the finger, critically damped so the release never bounces. */
const PRESS_SPRING = criticalSpring(250);

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
 * A raised card that is one button (a child, a report, a lesson, an alert): the lapis wash shows at
 * once under the finger while the card eases in to 98 % on a spring and back out on release (the
 * staff app's press). A new touch takes over the running spring where it is, so a quick tap never
 * jumps. Reduce Motion: the wash alone, no scale.
 */
export function PressCard({ label, onPress, hint, style, children }: PressCardProps) {
  const { color } = useTheme();
  const still = useA11yPref('reduceMotion');
  const [scale] = useState(() => new Animated.Value(1));
  const press = (down: boolean) => () =>
    Animated.spring(scale, {
      toValue: pressScale(down, still),
      ...PRESS_SPRING,
      useNativeDriver: true,
    }).start();
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
