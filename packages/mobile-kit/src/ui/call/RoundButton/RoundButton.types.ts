import type { ReactNode } from 'react';
import type { RoundTone } from './round-button.schemas';

export interface RoundButtonProps {
  label: string;
  tone: RoundTone;
  onPress: () => void;
  /** A toggle: its state is read out and the circle fills. */
  pressed?: boolean;
  icon: (ink: string) => ReactNode;
  /** The spoken name when it says more than the word under the circle (a count, a route). */
  accessibilityLabel?: string;
}
