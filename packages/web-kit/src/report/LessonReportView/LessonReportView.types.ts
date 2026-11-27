import type { ReactNode } from 'react';

export interface Props {
  reportId: string;
  /** The page header (names, date): off inside a lesson row, on for a family's report screen. */
  head?: boolean;
  /** Shown instead of the quiet error line when the page cannot be read. */
  fallback?: ReactNode;
}
