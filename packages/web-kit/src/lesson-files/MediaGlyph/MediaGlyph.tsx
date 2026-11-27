import { cn } from '@ab/web-kit/lib/utils';
import type { MediaGlyphProps } from './MediaGlyph.types';
import { FILLED } from './media-glyph.helpers';

export function MediaGlyph({ name, className }: MediaGlyphProps) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cn('size-4 fill-current', className)}>
      <path d={FILLED[name]} />
    </svg>
  );
}
