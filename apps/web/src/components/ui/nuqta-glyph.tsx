import type { Glyph } from '@ab/shared';
import { cn } from '@/lib/utils';

// The calligrapher's rhombic dot (docs/07 §5–6). Shape carries the state, colour only confirms it:
// fill = settled, half = underway, hollow = waiting, struck = stopped. Never above 16px except the
// empty state. Colour comes from `currentColor`.
const OUTLINE = 'M8 2.9 13.1 8 8 13.1 2.9 8Z';

export interface NuqtaGlyphProps {
  shape: Glyph;
  className?: string;
}

export function NuqtaGlyph({ shape, className }: NuqtaGlyphProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      data-glyph={shape}
      className={cn('size-3 shrink-0', className)}
    >
      {shape === 'fill' ? (
        <path fill="currentColor" d="M8 2.2 13.8 8 8 13.8 2.2 8Z" />
      ) : (
        <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" d={OUTLINE} />
      )}
      {shape === 'half' && <path fill="currentColor" d="M2.9 8h10.2L8 13.1Z" />}
      {shape === 'struck' && (
        <path d="M2.6 13.4 13.4 2.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** Ordinal grade pips (1..5): filled first, at the inline-start; reads in greyscale print. */
export function GradePips({ pips, className }: { pips: number; className?: string }) {
  return (
    <span className={cn('inline-flex gap-px', className)} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <NuqtaGlyph key={n} shape={n <= pips ? 'fill' : 'hollow'} className="size-[9px]" />
      ))}
    </span>
  );
}
