import { formatClock, progressOf, seekAtPoint, seekByKey } from '@ab/client-core';
import type { KeyboardEvent, PointerEvent } from 'react';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const P = t.audioPlayer;

interface Props {
  position: number;
  duration: number;
  seek: (position: number) => void;
}

const isRtl = (el: HTMLElement): boolean => getComputedStyle(el).direction === 'rtl';

/** The position under the pointer on the bar. */
function pointAt(e: PointerEvent<HTMLDivElement>, duration: number): number {
  const box = e.currentTarget.getBoundingClientRect();
  const point = { x: e.clientX - box.left, width: box.width, duration };
  return seekAtPoint({ ...point, rtl: isRtl(e.currentTarget) });
}

/** Each time is an LTR island in the RTL row. */
export function SeekBar({ position, duration, seek }: Props) {
  const share = Math.round(progressOf(position, duration) * 100);
  const total = duration > 0 ? formatClock(duration) : '—';
  const at = formatClock(position);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const to = seekByKey({ key: e.key, position, duration, rtl: isRtl(e.currentTarget) });
    if (to === null) return;
    e.preventDefault();
    seek(to);
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    seek(pointAt(e, duration));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) seek(pointAt(e, duration));
  };
  return (
    <div className="grid gap-1.5">
      <div
        role="slider"
        tabIndex={0}
        aria-label={P.seek}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        aria-valuetext={P.position.replace('{at}', at).replace('{total}', total)}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className="flex h-6 cursor-pointer touch-none items-center rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
      >
        {/* The fill and the knob follow the play with no easing: a scrub never lags the finger. */}
        <div className="relative h-1.5 w-full rounded-full bg-sunk">
          <div className="h-1.5 rounded-full bg-lapis" style={{ width: `${share}%` }} />
          <span
            aria-hidden="true"
            className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-lapis ring-4 ring-lapis-wash"
            style={{ insetInlineStart: `calc(${share}% - 0.5rem)` }}
          />
        </div>
      </div>
      <p className="flex justify-between text-xs text-ink-3">
        <Ltr>{at}</Ltr>
        <Ltr>{total}</Ltr>
      </p>
    </div>
  );
}
