import { cn } from '#/lib/index.ts';

// Filled media glyphs of the players (boards FamRecWeb*): the icon sprite is line art, a play
// triangle reads better solid. Not directional: «تشغيل» points the same way in both directions.

const FILLED = {
  play: 'M6.5 4.2v11.6a.8.8 0 0 0 1.2.7l9-5.8a.8.8 0 0 0 0-1.4l-9-5.8a.8.8 0 0 0-1.2.7Z',
  pause: 'M5.5 4h3v12h-3zM11.5 4h3v12h-3z',
} as const;

export type MediaGlyphName = keyof typeof FILLED;

export function MediaGlyph({ name, className }: { name: MediaGlyphName; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={cn('size-4 fill-current', className)}>
      <path d={FILLED[name]} />
    </svg>
  );
}
