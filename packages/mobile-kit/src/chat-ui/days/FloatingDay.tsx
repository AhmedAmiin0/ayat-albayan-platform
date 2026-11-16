import { Animated, type LayoutRectangle } from 'react-native';
import { DayChip } from './DayChip';
import { FLOAT_TOP } from './top-band';

interface FloatingDayProps {
  label: string | null;
  opacity: Animated.Value;
  /** Its measured box (DayChip with its margins), so the band follows the system font. */
  onChip?: (layout: LayoutRectangle) => void;
}

/** The day of the topmost message while she scrolls (useTopDay), over the top of the list. */
export function FloatingDay({ label, opacity, onChip }: FloatingDayProps) {
  if (!label) return null;
  return (
    <Animated.View
      pointerEvents="none"
      testID="floating-day"
      onLayout={(e) => onChip?.(e.nativeEvent.layout)}
      style={{ position: 'absolute', top: FLOAT_TOP, start: 0, end: 0, alignItems: 'center', opacity }}
    >
      <DayChip label={label} />
    </Animated.View>
  );
}
