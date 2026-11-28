import type { ReactNode } from 'react';
import type { Palette } from '../../../theme';

export interface QuoteCardProps {
  /** The quoted message's id: its testID and what `onJump` gets. */
  id: string;
  /** Who sent it; null hides the line. */
  sender: string | null;
  /** Its first line (or a file's kind). */
  text: string;
  /** A file's emoji before the text. */
  icon?: string | null;
  /** A drawn file icon before the text, in place of the emoji (the student channel). */
  glyph?: ReactNode;
  /** The bar's and the sender's colour: the brand (default), or the sender's role ink. */
  tone?: keyof Palette;
  /** A photo's or PDF's thumb at the inline-end. */
  thumb?: ReactNode;
  /** Goes to the original; absent, the card is plain. */
  onJump?: (id: string) => void;
}
