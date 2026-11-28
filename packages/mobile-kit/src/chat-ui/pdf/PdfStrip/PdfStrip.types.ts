import type { ReactNode } from 'react';

export interface PdfStripProps {
  /** A spinner over the strip: page 1's answer or its image is on its way. */
  waiting: boolean;
  /**
   * null: page 1 (or the spinner) fills the strip; else a large «PDF» and this line ('' = none).
   */
  note: string | null;
  /** Page 1's image, from the strip's top. */
  children?: ReactNode;
}
