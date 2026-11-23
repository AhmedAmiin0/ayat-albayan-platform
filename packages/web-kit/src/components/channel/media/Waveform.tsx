import { formatClock, progressOf, seekAtPoint, seekByKey, waveBars } from '@ab/client-core';
import type { KeyboardEvent, MouseEvent } from 'react';
import { t } from '#/lib/i18n/index.ts';
import { cn } from '#/lib/index.ts';

interface Props {
  /** The message id: the same bars on every render (waveBars). */
  seed: string;
  position: number;
  duration: number;
  seek: (position: number) => void;
}

const rtlOf = (el: HTMLElement): boolean => getComputedStyle(el).direction === 'rtl';

/**
 * The voice note's waveform as its seek slider: the played bars in the brand colour, filling from
 * the reading start (the colour change eases on the quick duration as the note plays); a click
 * lands on its share, the arrows move ±10 s, Home and End jump.
 */
export function Waveform({ seed, position, duration, seek }: Props) {
  const played = progressOf(position, duration);
  const bars = waveBars(seed);
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    seek(seekAtPoint({ x, width: box.width, duration, rtl: rtlOf(e.currentTarget) }));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const rtl = rtlOf(e.currentTarget);
    const to = seekByKey({ key: e.key, position, duration, rtl });
    if (to === null) return;
    e.preventDefault();
    seek(to);
  };
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={t.studentChannel.kinds.voice}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(position)}
      aria-valuetext={formatClock(position)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-[2px] rounded-sm"
    >
      {bars.map((h, i) => (
        <span
          // The bars never move: their place is their identity.
          key={i}
          style={{ height: `${Math.round(h * 100)}%` }}
          className={cn(
            'w-[3px] shrink-0 rounded-full transition-colors duration-(--duration-quick)',
            (i + 0.5) / bars.length <= played ? 'bg-lapis' : 'bg-rule-strong',
          )}
        />
      ))}
    </div>
  );
}
