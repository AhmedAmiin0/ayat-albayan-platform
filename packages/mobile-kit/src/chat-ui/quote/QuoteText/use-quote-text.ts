import { type, useTheme } from '../../../theme';
import { quoteLine } from '../quote-style';
import type { QuoteTextProps } from './QuoteText.types';

/** A drawn glyph stands in for the emoji, so the words then go without it. */
export function useQuoteText({ text, icon, glyph, style }: QuoteTextProps) {
  const { color } = useTheme();
  const lineStyle = { ...style, fontFamily: type.ui[400], color: color.ink2 };
  const words = glyph ? text : quoteLine(icon, text);
  return { lineStyle, words };
}
