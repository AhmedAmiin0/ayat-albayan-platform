// Hold-to-record's finger maths (owner 2026-10-27, as WhatsApp): pure, so both directions are tested.
// dx and dy are PHYSICAL (pageX/pageY deltas); the start side is the left in LTR, the right in RTL.

/** Slide up this far (pt) to lock the recording hands-free. */
export const LOCK_DISTANCE = 80;

/** Slide toward the start this far to cancel: 100 pt, or 35 % of a wider screen. */
export const cancelDistance = (width: number): number => Math.max(100, 0.35 * width);

/** How far the finger moved toward the inline-start (negative = toward the end). */
export const towardStart = (dx: number, rtl: boolean): number => dx * (rtl ? 1 : -1);

/** The round button's physical translateX: follows the finger, clamped to the start side within `max`. */
export function micShift(dx: number, rtl: boolean, max: number): number {
  return rtl ? Math.min(Math.max(dx, 0), max) : Math.max(Math.min(dx, 0), -max);
}

/** «اسحب للإلغاء» fades as the finger nears the cancel line. */
export function hintOpacity(toStart: number, cancel: number): number {
  return Math.min(1, Math.max(0, 1 - toStart / cancel));
}

export type DragVerdict = 'cancel' | 'lock' | 'none';

interface Drag {
  dx: number;
  dy: number;
  rtl: boolean;
  /** The window's width (cancelDistance). */
  width: number;
}

/** Past the cancel line → cancel; up past LOCK_DISTANCE while still near the button → lock. */
export function dragVerdict({ dx, dy, rtl, width }: Drag): DragVerdict {
  const cancel = cancelDistance(width);
  const toStart = towardStart(dx, rtl);
  if (toStart > cancel) return 'cancel';
  if (-dy > LOCK_DISTANCE && toStart < cancel / 2) return 'lock';
  return 'none';
}
