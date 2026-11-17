import { SWIPE_MAX, SWIPE_REPLY_AT, swipeAnswers, swipeClaims, swipeOffset } from './swipe';

describe('swipe to answer: toward the inline-end only (uncovering the icon at the start), never a scroll', () => {
  it('Arabic (the end is the left, -1): a swipe to the left answers; to the right does nothing', () => {
    expect(swipeClaims({ dx: -30, dy: 2 }, -1)).toBe(true);
    expect(swipeClaims({ dx: 30, dy: 2 }, -1)).toBe(false);
    expect(swipeAnswers(-SWIPE_REPLY_AT, -1)).toBe(true);
    expect(swipeAnswers(SWIPE_REPLY_AT, -1)).toBe(false);
  });

  it('English (the end is the right, 1) is mirrored: to the right', () => {
    expect(swipeClaims({ dx: 30, dy: 2 }, 1)).toBe(true);
    expect(swipeClaims({ dx: -30, dy: 2 }, 1)).toBe(false);
    expect(swipeAnswers(SWIPE_REPLY_AT, 1)).toBe(true);
  });

  it('a small or a mostly vertical move stays the list scroll', () => {
    expect(swipeClaims({ dx: -10, dy: 0 }, -1)).toBe(false);
    expect(swipeClaims({ dx: -30, dy: 12 }, -1)).toBe(false);
  });

  it('letting go short of the mark does not answer', () => {
    expect(swipeAnswers(-(SWIPE_REPLY_AT - 1), -1)).toBe(false);
  });

  it('the bubble follows only toward the end, at most SWIPE_MAX', () => {
    expect(swipeOffset(-30, -1)).toBe(-30);
    expect(swipeOffset(30, -1)).toBe(0);
    expect(swipeOffset(-500, -1)).toBe(-SWIPE_MAX);
    expect(swipeOffset(500, 1)).toBe(SWIPE_MAX);
  });
});
