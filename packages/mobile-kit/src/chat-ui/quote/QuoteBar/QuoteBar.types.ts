import type { ReactNode } from 'react';
import type { Palette } from '../../../theme';

export interface QuoteBarProps {
  /** Who sent the answered message; null hides it. */
  sender: string | null;
  text: string;
  icon?: string | null;
  /** A drawn file icon in place of the emoji (the student channel). */
  glyph?: ReactNode;
  /** The bar's and the sender's colour: the brand (default), or the sender's role ink. */
  tone?: keyof Palette;
  /** ✕: stop answering it. */
  onCancel: () => void;
}
