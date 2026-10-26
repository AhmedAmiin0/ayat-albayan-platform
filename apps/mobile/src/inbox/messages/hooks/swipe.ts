// Swipe to answer (SwipeReply): pure, so the thresholds are tested without a gesture.

/** How far (pt) a bubble must travel before letting go answers it. */
export const SWIPE_REPLY_AT = 56;
/** A swipe starts only this far sideways (pt)… */
const START = 14;
/** …and clearly more sideways than down: the list keeps every vertical scroll. */
const SIDEWAYS = 3;
/** The bubble follows the finger at most this far (pt). */
export const SWIPE_MAX = 80;

export interface Move {
  dx: number;
  dy: number;
}

/**
 * `dir` is the way toward the screen's centre (bubbleSide's toCentre): left (-1) for ours on the
 * right, right (1) for theirs on the left. As WhatsApp, the bubble moves away from its own edge,
 * uncovering the reply icon drawn there (SwipeReply). Physical, so the same in Arabic and English.
 */
type Dir = 1 | -1;

/** Whether a move is a reply swipe (toward the centre, mostly sideways) and not a scroll. */
export function swipeClaims({ dx, dy }: Move, dir: Dir): boolean {
  return dx * dir > START && Math.abs(dx) > Math.abs(dy) * SIDEWAYS;
}

/** Where the bubble sits while dragged: only toward the centre, at most SWIPE_MAX. */
export function swipeOffset(dx: number, dir: Dir): number {
  // `|| 0`: at rest it is 0, never -0 (a leftward swipe multiplies by -1).
  return Math.min(Math.max(dx * dir, 0), SWIPE_MAX) * dir || 0;
}

/** Letting go far enough answers the message. */
export const swipeAnswers = (dx: number, dir: Dir): boolean => dx * dir >= SWIPE_REPLY_AT;
