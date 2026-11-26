import { cn } from '@ab/web-kit/lib/utils';

// The sprite is line art but a solid play triangle reads better; not directional.

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
