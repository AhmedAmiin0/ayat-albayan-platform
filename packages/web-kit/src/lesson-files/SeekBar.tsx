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

/** The bar: the heard share filled (the family look adds the gold thumb at its end). */
function SeekTrack({ share }: { share: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-sunk family:relative family:h-2 family:bg-white/20">
      <div
        className="h-1.5 rounded-full bg-lapis family:h-2 family:bg-[image:var(--fam-gold-fill)]"
        style={{ width: `${share}%` }}
      />
      <span
        aria-hidden="true"
        className="absolute top-1/2 hidden size-[18px] -translate-y-1/2 rounded-full bg-[#e9c45a]
          shadow-[0_0_0_4px_rgba(233,196,90,0.25)] family:block"
        style={{ insetInlineStart: `calc(${share}% - 9px)` }}
      />
    </div>
  );
}

/**
 * «موضع التشغيل»: a slider over the heard share (arrows ±10 s, Home/End, tap or drag), the clock
 * under it «12:40 … 45:20», each time an LTR island in the RTL row. The family look: a gold fill
 * and thumb on the emerald band.
 */
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
    <div className="grid gap-1.5 family:col-span-2 family:col-start-2 family:row-start-1 family:gap-0.5">
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
        className="flex h-6 cursor-pointer touch-none items-center rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring family:h-11"
      >
        <SeekTrack share={share} />
      </div>
      <p
        className="flex justify-between text-xs text-ink-3 family:font-latin family:text-[13px]
          family:font-semibold family:text-fam-hero-ink-2"
      >
        <Ltr>{at}</Ltr>
        <Ltr>{total}</Ltr>
      </p>
    </div>
  );
}
