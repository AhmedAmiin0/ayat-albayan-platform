import type { ReactNode } from 'react';
import type { Animated } from 'react-native';

export type Arrive = (shown: Animated.Value, delay: number) => void;

export interface RiseProps {
  /** Its place in the list: later cards start a little after. */
  index: number;
  /** Reduce Motion (read once by the screen). */
  still: boolean;
  children: ReactNode;
}
