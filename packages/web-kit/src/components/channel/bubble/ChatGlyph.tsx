import type { SVGProps } from 'react';
import { cn } from '@ab/web-kit/lib/utils';

// The chat's own line glyphs (the FamChat boards), on the Icon sprite's 20px grid and 1.6 stroke:
// the menu's pencil and info, the composer's emoji face, the files' photo and page, the deleted
// mark, the voice note's play and pause (filled), and the ticks.
const PATHS = {
  pencil: 'M12.8 4.2a1.8 1.8 0 0 1 2.6 2.6L7.5 14.7 4 15.9l1.2-3.5 7.6-8.2ZM11.5 5.5l2.9 2.9',
  info: 'M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0ZM10 9v4.5M10 6.6h.01',
  smile:
    'M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0ZM7.2 11.8a3.4 3.4 0 0 0 5.6 0M7.8 8h.01M12.2 8h.01',
  photo:
    'M4.5 4h11A1.5 1.5 0 0 1 17 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5v-9A1.5 1.5 0 0 1 4.5 4ZM3 13l4-4 3 3 2-2 5 4.5M12.5 7.5h.01',
  page: 'M5.5 3h6l3.5 3.5V16a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM11.5 3v3.5H15M7.5 10.5h5M7.5 13h5',
  ban: 'M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0ZM5.4 5.4l9.2 9.2',
  play: 'M7 4.8v10.4a.6.6 0 0 0 .9.5l8-5.2a.6.6 0 0 0 0-1l-8-5.2a.6.6 0 0 0-.9.5Z',
  pause: 'M6.5 4.5h2v11h-2zM11.5 4.5h2v11h-2z',
  clock: 'M15.5 10a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0ZM10 7v3l2 1.2',
  check: 'm4 10.5 3.5 3.5 8-8.5',
  checks: 'm1.5 10.5 3.5 3.5 8-8.5M9 13.5l.5.5 8-8.5',
} as const;

export type ChatGlyphName = keyof typeof PATHS;

/** Filled, not stroked: the play and pause shapes. */
const FILLED: Partial<Record<ChatGlyphName, true>> = { play: true, pause: true };

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: ChatGlyphName;
}

/** Decorative (aria-hidden): name the control, not the glyph. Default 18px. */
export function ChatGlyph({ name, className, ...props }: Props) {
  const filled = FILLED[name] === true;
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-[18px] shrink-0', className)}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
