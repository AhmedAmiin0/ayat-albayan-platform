import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

const TURN_MS = 36_000;

export interface KhatamStarProps {
  size: number;
  color: string;
  /** Reduce Motion: the star stands still. */
  still: boolean;
}

/**
 * The eight-point star (khatam) of the academy's emblem, drawn as a thin gold outline that turns once
 * every 36 s behind the mark: two squares, one at 45°, and a ring. Decorative.
 */
export function KhatamStar({ size, color, still }: KhatamStarProps) {
  const [turn] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) return undefined;
    const loop = Animated.loop(
      Animated.timing(turn, { toValue: 1, duration: TURN_MS, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn, still]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View
      testID="khatam-star"
      style={{ position: 'absolute', width: size, height: size, transform: [{ rotate }] }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg viewBox="0 0 100 100" width={size} height={size}>
        <Rect x={17} y={17} width={66} height={66} fill="none" stroke={color} strokeWidth={1.1} strokeLinejoin="round" />
        <Rect
          x={17}
          y={17}
          width={66}
          height={66}
          fill="none"
          stroke={color}
          strokeWidth={1.1}
          strokeLinejoin="round"
          transform="rotate(45 50 50)"
        />
        <Circle cx={50} cy={50} r={38} fill="none" stroke={color} strokeWidth={0.6} strokeOpacity={0.6} />
      </Svg>
    </Animated.View>
  );
}
