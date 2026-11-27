import { seekAtPoint } from '@ab/client-core';
import type { PointerEvent } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export const P = t.audioPlayer;

export const isRtl = (el: HTMLElement): boolean => getComputedStyle(el).direction === 'rtl';

/** The position under the pointer on the bar. */
export function pointAt(e: PointerEvent<HTMLDivElement>, duration: number): number {
  const box = e.currentTarget.getBoundingClientRect();
  const point = { x: e.clientX - box.left, width: box.width, duration };
  return seekAtPoint({ ...point, rtl: isRtl(e.currentTarget) });
}
