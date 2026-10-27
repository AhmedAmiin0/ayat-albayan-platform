// The photo viewer's gesture maths (pure, unit-tested): pinch 1×–4×, pan only as far as the zoomed
// photo reaches, a double tap toggling 1× and 2.5×. use-zoom.ts feeds it PanResponder's touches.

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_SCALE = 2.5;
/** Two taps closer than this are a double tap. */
const DOUBLE_TAP_MS = 300;
/** A finger that moved less than this (pt) tapped instead of dragging. */
const TAP_SLOP = 10;

export interface Point {
  x: number;
  y: number;
}

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** The distance between two fingers. */
export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** The scale while pinching: the scale at the start, grown as the fingers spread, within 1×–4×. */
export function pinchScale(p: { startScale: number; startDistance: number; distance: number }): number {
  if (p.startDistance <= 0) return clamp(p.startScale, MIN_SCALE, MAX_SCALE);
  return clamp((p.startScale * p.distance) / p.startDistance, MIN_SCALE, MAX_SCALE);
}

/** A double tap: zoomed in → back to 1×; at 1× → 2.5×. */
export const toggleScale = (scale: number): number => (scale > MIN_SCALE ? MIN_SCALE : DOUBLE_SCALE);

/** The offset kept inside the photo: at scale s a side of length L may move (s − 1) · L / 2 each way. */
export function clampPan(p: { offset: Point; scale: number; size: { width: number; height: number } }): Point {
  const maxX = Math.max(0, ((p.scale - 1) * p.size.width) / 2);
  const maxY = Math.max(0, ((p.scale - 1) * p.size.height) / 2);
  return { x: clamp(p.offset.x, -maxX, maxX), y: clamp(p.offset.y, -maxY, maxY) };
}

/** A second tap close enough in time to the last one. */
export const isDoubleTap = (lastTap: number, now: number): boolean => lastTap > 0 && now - lastTap < DOUBLE_TAP_MS;

/** A release that barely moved: a tap. */
export const isTap = (dx: number, dy: number): boolean => Math.hypot(dx, dy) < TAP_SLOP;
