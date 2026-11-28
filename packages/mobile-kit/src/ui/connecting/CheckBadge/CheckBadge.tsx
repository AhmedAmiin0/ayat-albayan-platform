import { Animated, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../../theme';
import { TICK_LENGTH, useBadgePop } from '../use-badge-pop';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const SIZE = 20;

export function CheckBadge({ still }: { still: boolean }) {
  const { color } = useTheme();
  const { scale, offset } = useBadgePop(still);
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
            strokeDashoffset={offset}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
