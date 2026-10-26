import { Animated } from 'react-native';
import { DayChip } from './DayChip';

/** The day of the topmost message while she scrolls (useTopDay), over the top of the list. */
export function FloatingDay({ label, opacity }: { label: string | null; opacity: Animated.Value }) {
  if (!label) return null;
  return (
    <Animated.View
      pointerEvents="none"
      testID="floating-day"
      style={{ position: 'absolute', top: 4, start: 0, end: 0, alignItems: 'center', opacity }}
    >
      <DayChip label={label} />
    </Animated.View>
  );
}
