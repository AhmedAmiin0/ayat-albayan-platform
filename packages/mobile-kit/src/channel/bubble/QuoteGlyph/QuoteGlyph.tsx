import { useTheme } from '../../../theme';
import type { QuoteGlyphProps } from './QuoteGlyph.types';
import { ICONS } from './quote-glyph.helpers';

/** A quoted file's icon before its kind word: 14pt, ink-3; nothing for a text or a deleted one. */
export function QuoteGlyph({ kind, deleted }: QuoteGlyphProps) {
  const { color } = useTheme();
  const Icon = deleted ? null : ICONS[kind];
  return Icon ? <Icon color={color.ink3} size={14} /> : null;
}
