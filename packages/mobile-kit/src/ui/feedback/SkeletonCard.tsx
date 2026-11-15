import { Animated, View } from 'react-native';
import { raisedCard } from '../surface/surface';
import { usePulse } from '../motion/use-pulse';
import { useA11yPref } from '../primitives/use-a11y-pref';
import { shape, useTheme } from '../../theme';

/** One breath of the placeholder, ms each way. */
const BREATH_MS = 700;

/**
 * A card-sized placeholder while a list loads (docs/50 §6): the raised card with a circle and two
 * bars that breathe gently; still under «Reduce Motion». Hidden from screen readers (the screen
 * says «جارٍ التحميل» once).
 */
export function SkeletonCard() {
  const { color } = useTheme();
  const still = useA11yPref('reduceMotion');
  const pulse = usePulse({ duration: BREATH_MS, still });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });
  const bar = (width: `${number}%`) => (
    <View
      style={{ width, height: 12, borderRadius: shape.radius.sm, backgroundColor: color.sunk }}
    />
  );
  return (
    <Animated.View
      testID="skeleton-card"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ ...raisedCard(color), flexDirection: 'row', gap: 12, padding: 16, opacity }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.sunk }} />
      <View style={{ flex: 1, gap: 10, justifyContent: 'center' }}>
        {bar('60%')}
        {bar('35%')}
      </View>
    </Animated.View>
  );
}
