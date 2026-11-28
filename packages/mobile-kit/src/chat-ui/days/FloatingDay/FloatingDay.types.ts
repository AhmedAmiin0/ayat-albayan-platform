import type { Animated, LayoutRectangle } from 'react-native';

export interface FloatingDayProps {
  label: string | null;
  opacity: Animated.Value;
  /** Its measured box (DayChip with its margins), so the band follows the system font. */
  onChip?: (layout: LayoutRectangle) => void;
}
