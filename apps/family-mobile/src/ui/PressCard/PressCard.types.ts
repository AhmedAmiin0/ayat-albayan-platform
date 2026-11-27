import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

export interface PressCardProps {
  /** What the reader hears for the whole card. */
  label: string;
  onPress: () => void;
  hint?: string;
  /** The card's own layout (gap, padding, direction). */
  style?: ViewStyle;
  children: ReactNode;
}
