import { describe, expect, it } from 'vitest';
import { isNearBottom, NEAR_BOTTOM_PX } from './stick-to-bottom';

describe('isNearBottom (the log stays pinned to the newest message)', () => {
  it('at the very bottom', () => {
    expect(isNearBottom({ scrollTop: 600, scrollHeight: 1000, clientHeight: 400 })).toBe(true);
  });

  it('within the threshold still counts as the bottom', () => {
    expect(isNearBottom({ scrollTop: 600 - NEAR_BOTTOM_PX, scrollHeight: 1000, clientHeight: 400 })).toBe(true);
  });

  it('scrolled up past the threshold: the reader is reading older messages', () => {
    expect(isNearBottom({ scrollTop: 600 - NEAR_BOTTOM_PX - 1, scrollHeight: 1000, clientHeight: 400 })).toBe(false);
    expect(isNearBottom({ scrollTop: 0, scrollHeight: 1000, clientHeight: 400 })).toBe(false);
  });

  it('a log shorter than its box is always at the bottom', () => {
    expect(isNearBottom({ scrollTop: 0, scrollHeight: 300, clientHeight: 400 })).toBe(true);
  });

  it('takes a custom threshold', () => {
    expect(isNearBottom({ scrollTop: 590, scrollHeight: 1000, clientHeight: 400 }, 5)).toBe(false);
  });
});
