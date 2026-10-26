// Drag the quick-replies sheet down to close it (ReplySheetFrame): pure, so it is tested without a gesture.

/** A drag starts once the finger moved this far down (pt), more down than sideways. */
const START = 8;
/** Letting go this far down (pt)… */
export const CLOSE_AT = 96;
/** …or flicking down at least this fast (pt/ms) closes the sheet. */
const FLICK = 0.8;

export const dragClaims = (dy: number, dx: number): boolean => dy > START && dy > Math.abs(dx);

/** Where the sheet sits while dragged: only downward. */
export const dragOffset = (dy: number): number => Math.max(dy, 0);

export const dragCloses = (dy: number, vy: number): boolean => dy >= CLOSE_AT || (dy > START && vy >= FLICK);
