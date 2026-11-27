import type { ReactNode } from 'react';

/** Receives open, or null when the lesson offers nothing. */
export type OptionsRender = (open: (() => void) | null) => ReactNode;

export interface OptionsTriggerProps {
  /** Opens the menu; null when the lesson offers nothing. */
  open: (() => void) | null;
  /** The caller's own trigger; without one, the «خيارات الحلقة» button. */
  render: OptionsRender | undefined;
}
