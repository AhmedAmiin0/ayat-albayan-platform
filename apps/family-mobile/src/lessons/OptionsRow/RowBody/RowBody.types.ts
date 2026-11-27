import type { ReactNode } from 'react';

export interface RowBodyProps {
  /** Opens the lesson options; null when the lesson offers none. */
  open: (() => void) | null;
  label: string;
  notice: string | null;
  children: ReactNode;
}
