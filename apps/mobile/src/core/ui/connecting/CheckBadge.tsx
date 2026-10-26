import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const SIZE = 20;
/** The design's dash travel (24 → 0), mapped onto the tick's real length so it draws over the full 360 ms. */
const TRAVEL = 24;
const TICK_LENGTH = 11.4;
const POP_MS = 320;
const DRAW_MS = 360;
const DRAW_DELAY_MS = 120;

/**
 * «تم الاتصال»'s 20 pt badge: it pops in (0.6 → 1.12 → 1, 320 ms) while its tick draws (dash offset
 * 24 → 0, 360 ms after 120 ms). The pop runs on the native driver; an SVG dash offset cannot.
 * Reduce Motion: the finished badge, no pop.
 */
export function CheckBadge({ still }: { still: boolean }) {
  const { color } = useTheme();
  const [scale] = useState(() => new Animated.Value(still ? 1 : 0.6));
  const [dash] = useState(() => new Animated.Value(still ? 0 : TRAVEL));
  useEffect(() => {
    if (still) {
      scale.setValue(1);
      dash.setValue(0);
      return undefined;
    }
    const pop = (toValue: number, duration: number) =>
      Animated.timing(scale, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    const draw = Animated.timing(dash, { toValue: 0, duration: DRAW_MS, delay: DRAW_DELAY_MS, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    const run = Animated.parallel([Animated.sequence([pop(1.12, POP_MS * 0.6), pop(1, POP_MS * 0.4)]), draw]);
    run.start();
    return () => run.stop();
  }, [still, scale, dash]);
  return (
    <View testID="check-badge" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View testID="check-badge-pop" style={{ transform: [{ scale }] }}>
        <Svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
          <Circle cx={10} cy={10} r={10} fill={color.ok} />
          {/* onLapis: the theme's white, the same in both schemes. */}
          <AnimatedPath
            testID="check-badge-tick"
            d="M6 10.2l2.7 2.7L14 7.6"
            fill="none"
            stroke={color.onLapis}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={TICK_LENGTH}
            strokeDashoffset={dash.interpolate({ inputRange: [0, TRAVEL], outputRange: [0, TICK_LENGTH] })}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
