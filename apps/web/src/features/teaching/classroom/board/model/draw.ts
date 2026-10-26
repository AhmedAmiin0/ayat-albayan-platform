import type { PenColor, Stroke } from './model';

/** The slice of CanvasRenderingContext2D the board uses (a stub in tests). */
export interface CtxLike {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
}

export interface PaintOptions {
  width: number;
  height: number;
  /** Token name → CSS colour; `raised` is the board's paper (and the eraser's ink). */
  resolve: (token: PenColor | 'raised') => string;
}

function paintStroke(ctx: CtxLike, s: Stroke, o: PaintOptions): void {
  const [x0, y0] = s.pts;
  if (x0 === undefined || y0 === undefined) return;
  ctx.strokeStyle = o.resolve(s.erase ? 'raised' : s.color);
  ctx.lineWidth = Math.max(1, s.width * o.width);
  ctx.beginPath();
  ctx.moveTo(x0 * o.width, y0 * o.height);
  // A lone point (a tap) still leaves a dot: round caps on a zero-length line.
  if (s.pts.length === 2) ctx.lineTo(x0 * o.width + 0.01, y0 * o.height);
  for (let i = 2; i + 1 < s.pts.length; i += 2) {
    ctx.lineTo((s.pts[i] ?? 0) * o.width, (s.pts[i + 1] ?? 0) * o.height);
  }
  ctx.stroke();
}

/**
 * Repaints the whole board: opaque paper first (the shared-board video must not be transparent),
 * then every stroke in order. The eraser paints with the paper colour, so it works in the video too.
 */
export function paintBoard(ctx: CtxLike, strokes: readonly Stroke[], o: PaintOptions): void {
  ctx.fillStyle = o.resolve('raised');
  ctx.fillRect(0, 0, o.width, o.height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) paintStroke(ctx, s, o);
}

/** Reads a theme token off :root (`--ink` → "#14261e"); a safe fallback when unset (tests). */
export function tokenColor(token: PenColor | 'raised'): string {
  const fallback = token === 'raised' ? '#ffffff' : '#000000';
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
  return value || fallback;
}
