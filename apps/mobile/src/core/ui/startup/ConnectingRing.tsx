import { Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useCycle } from '@/core/ui/motion/use-cycle';

const SIZE = 220;
const TURN_MS = 1600;

export interface ConnectingRingProps {
  track: string;
  arc: string;
  /** Reduce Motion: the ring stands still. */
  still: boolean;
}

/** A thin track with a gold arc (dash 120 of 533) turning once every 1.6 s, linear. Decorative. */
export function ConnectingRing({ track, arc, still }: ConnectingRingProps) {
  const turn = useCycle({ duration: TURN_MS, still });
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      testID="connecting-ring"
      style={{ position: 'absolute', width: SIZE, height: SIZE, transform: [{ rotate }] }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
        <Circle cx={110} cy={110} r={104} fill="none" stroke={track} strokeWidth={3} />
        <Circle cx={110} cy={110} r={104} fill="none" stroke={arc} strokeWidth={3} strokeLinecap="round" strokeDasharray="120 533" />
      </Svg>
    </Animated.View>
  );
}
