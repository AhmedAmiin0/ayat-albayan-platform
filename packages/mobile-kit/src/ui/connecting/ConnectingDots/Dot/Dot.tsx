import { Animated } from 'react-native';
import { DOT_SIZE } from '../connecting-dots.helpers';
import type { DotProps } from './Dot.types';
import { useDot } from './use-dot';

export function Dot({ index, color, still }: DotProps) {
  const { opacity, translateY } = useDot({ index, still });
  return (
    <Animated.View
      testID="connecting-dot"
      style={{
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}
