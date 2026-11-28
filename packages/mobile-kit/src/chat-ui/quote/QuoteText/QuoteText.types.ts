import type { ReactNode } from 'react';
import type { TextStyle } from 'react-native';

export interface QuoteTextProps {
  text: string;
  /** A file's emoji before the words (the staff inbox). */
  icon?: string | null;
  /** A drawn file icon before the words, in place of the emoji (the student channel). */
  glyph?: ReactNode;
  style: TextStyle;
}
