import { Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { ConnectingRingProps } from './ConnectingRing.types';
import { SIZE } from './connecting-ring.helpers';
import { useConnectingRing } from './use-connecting-ring';

/** A thin track with a gold arc (dash 120 of 533) turning once every 1.6 s, linear. Decorative. */
export function ConnectingRing({ track, arc, still }: ConnectingRingProps) {
  const { rotate } = useConnectingRing({ still });
  return (
    <Animated.View
      testID="connecting-ring"
      style={{ position: 'absolute', width: SIZE, height: SIZE, transform: [{ rotate }] }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
        <Circle cx={110} cy={110} r={104} fill="none" stroke={track} strokeWidth={3} />
        <Circle
          cx={110}
          cy={110}
          r={104}
          fill="none"
          stroke={arc}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="120 533"
        />
      </Svg>
    </Animated.View>
  );
}
