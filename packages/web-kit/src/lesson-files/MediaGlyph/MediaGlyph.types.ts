import type { FILLED } from './media-glyph.helpers';

export type MediaGlyphName = keyof typeof FILLED;

export interface MediaGlyphProps {
  name: MediaGlyphName;
  className?: string;
}
