import { SWIPE_MAX, SWIPE_REPLY_AT, swipeAnswers, swipeClaims, swipeOffset } from './swipe';

describe('swipe to answer: toward the inline-end only (uncovering the icon at the start), never a scroll', () => {
  it('in Arabic (RTL) a swipe to the left answers; to the right does nothing', () => {
    expect(swipeClaims({ dx: -30, dy: 2 }, true)).toBe(true);
    expect(swipeClaims({ dx: 30, dy: 2 }, true)).toBe(false);
    expect(swipeAnswers(-SWIPE_REPLY_AT, true)).toBe(true);
    expect(swipeAnswers(SWIPE_REPLY_AT, true)).toBe(false);
  });

  it('in English (LTR) it is mirrored: to the right', () => {
    expect(swipeClaims({ dx: 30, dy: 2 }, false)).toBe(true);
    expect(swipeClaims({ dx: -30, dy: 2 }, false)).toBe(false);
    expect(swipeAnswers(SWIPE_REPLY_AT, false)).toBe(true);
  });

  it('a small or a mostly vertical move stays the list scroll', () => {
    expect(swipeClaims({ dx: -10, dy: 0 }, true)).toBe(false);
    expect(swipeClaims({ dx: -30, dy: 12 }, true)).toBe(false);
  });

  it('letting go short of the mark does not answer', () => {
    expect(swipeAnswers(-(SWIPE_REPLY_AT - 1), true)).toBe(false);
  });

  it('the bubble follows only toward the inline-end, at most SWIPE_MAX', () => {
    expect(swipeOffset(-30, true)).toBe(-30);
    expect(swipeOffset(30, true)).toBe(0);
    expect(swipeOffset(-500, true)).toBe(-SWIPE_MAX);
    expect(swipeOffset(500, false)).toBe(SWIPE_MAX);
  });
});
