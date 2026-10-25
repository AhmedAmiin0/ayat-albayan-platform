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
 * Which way is «toward the inline-end» on screen: left in Arabic (RTL), right in English. As WhatsApp,
 * the bubble moves away from the inline-start, uncovering the reply icon drawn there (SwipeReply).
 */
const sign = (rtl: boolean) => (rtl ? -1 : 1);

/** Whether a move is a reply swipe (toward the inline-end, mostly sideways) and not a scroll. */
export function swipeClaims({ dx, dy }: Move, rtl: boolean): boolean {
  return dx * sign(rtl) > START && Math.abs(dx) > Math.abs(dy) * SIDEWAYS;
}

/** Where the bubble sits while dragged: only toward the inline-end, at most SWIPE_MAX. */
export function swipeOffset(dx: number, rtl: boolean): number {
  // `|| 0`: at rest it is 0, never -0 (RTL multiplies by -1).
  return Math.min(Math.max(dx * sign(rtl), 0), SWIPE_MAX) * sign(rtl) || 0;
}

/** Letting go far enough answers the message. */
export const swipeAnswers = (dx: number, rtl: boolean): boolean => dx * sign(rtl) >= SWIPE_REPLY_AT;
