import { cn } from '@ab/web-kit/lib/utils';

/** Filled media glyphs (the boards' player): a play triangle, two pause bars. */
const GLYPH = {
  play: 'M7 4.5v15l12-7.5-12-7.5Z',
  pause: 'M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z',
} as const;

interface Props {
  playing?: boolean;
  className?: string;
}

/** The play / pause glyph of the family player and its recording rows; decorative. */
export function PlayGlyph({ playing = false, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
      className={cn('size-[18px] shrink-0', className)}
    >
      <path d={GLYPH[playing ? 'pause' : 'play']} />
    </svg>
  );
}
