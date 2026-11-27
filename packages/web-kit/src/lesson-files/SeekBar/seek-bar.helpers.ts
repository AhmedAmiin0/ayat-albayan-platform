import { formatClock, progressOf, seekAtPoint, seekByKey } from '@ab/client-core';
import type { KeyboardEvent, PointerEvent } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { Props } from './SeekBar.types';

export const P = t.audioPlayer;

export const isRtl = (el: HTMLElement): boolean => getComputedStyle(el).direction === 'rtl';

/** The position under the pointer on the bar. */
export function pointAt(e: PointerEvent<HTMLDivElement>, duration: number): number {
  const box = e.currentTarget.getBoundingClientRect();
  const point = { x: e.clientX - box.left, width: box.width, duration };
  return seekAtPoint({ ...point, rtl: isRtl(e.currentTarget) });
}

/** The bar's values and its key and pointer handlers. */
export function seekBarView({ position, duration, seek }: Props) {
  const share = Math.round(progressOf(position, duration) * 100);
  const total = duration > 0 ? formatClock(duration) : '—';
  const at = formatClock(position);
  const valueText = P.position.replace('{at}', at).replace('{total}', total);
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
  const max = Math.round(duration);
  const now = Math.round(position);
  return { share, total, at, valueText, max, now, onKeyDown, onPointerDown, onPointerMove };
}
