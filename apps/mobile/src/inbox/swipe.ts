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

/** Which way is «toward the inline-start» on screen: right in Arabic (RTL), left in English. */
const sign = (rtl: boolean) => (rtl ? 1 : -1);

/** Whether a move is a reply swipe (toward the inline-start, mostly sideways) and not a scroll. */
export function swipeClaims({ dx, dy }: Move, rtl: boolean): boolean {
  return dx * sign(rtl) > START && Math.abs(dx) > Math.abs(dy) * SIDEWAYS;
}

/** Where the bubble sits while dragged: only toward the inline-start, at most SWIPE_MAX. */
export function swipeOffset(dx: number, rtl: boolean): number {
  return Math.min(Math.max(dx * sign(rtl), 0), SWIPE_MAX) * sign(rtl);
}

/** Letting go far enough answers the message. */
export const swipeAnswers = (dx: number, rtl: boolean): boolean => dx * sign(rtl) >= SWIPE_REPLY_AT;
