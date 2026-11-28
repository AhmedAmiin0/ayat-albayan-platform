import type { ReactNode } from 'react';

export interface AttachTileProps {
  /** The full name, for the screen reader. */
  label: string;
  /** One line under the circle; falls back to the label when absent. */
  short?: string;
  onPress: () => void;
  children: ReactNode;
}
