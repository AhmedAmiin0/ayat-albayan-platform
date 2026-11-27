import { Animated, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../../theme';
import type { CheckBadgeProps } from './CheckBadge.types';
import { AnimatedPath, SIZE, TICK_LENGTH, TRAVEL } from './check-badge.helpers';
import { useCheckBadge } from './use-check-badge';

export function CheckBadge({ still }: CheckBadgeProps) {
  const { color } = useTheme();
  const { scale, dash } = useCheckBadge({ still });
  return (
    <View
      testID="check-badge"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
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
            strokeDashoffset={dash.interpolate({
              inputRange: [0, TRAVEL],
              outputRange: [0, TICK_LENGTH],
            })}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
