import { Animated } from 'react-native';
import { DayChip } from '../DayChip';
import { FLOAT_TOP } from '../top-band';
import type { FloatingDayProps } from './FloatingDay.types';

/**
 * The day of the topmost message while she scrolls (the staff thread's useTopDay), over the top of
 * the list.
 */
export function FloatingDay({ label, opacity, onChip }: FloatingDayProps) {
  if (!label) return null;
  return (
    <Animated.View
      pointerEvents="none"
      testID="floating-day"
      onLayout={(e) => onChip?.(e.nativeEvent.layout)}
      style={{
        position: 'absolute',
        top: FLOAT_TOP,
        start: 0,
        end: 0,
        alignItems: 'center',
        opacity,
      }}
    >
      <DayChip label={label} />
    </Animated.View>
  );
}
