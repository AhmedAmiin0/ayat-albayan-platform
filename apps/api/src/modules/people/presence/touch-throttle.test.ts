import { describe, expect, it } from 'vitest';
import { shouldTouch, TOUCH_EVERY_MS, TouchThrottle } from './touch-throttle';

describe('shouldTouch', () => {
  it('writes the first time and again only after a minute', () => {
    expect(shouldTouch(undefined, 0)).toBe(true);
    expect(shouldTouch(1_000, 1_000 + TOUCH_EVERY_MS - 1)).toBe(false);
    expect(shouldTouch(1_000, 1_000 + TOUCH_EVERY_MS)).toBe(true);
  });

  it('does not write when the clock went back', () => {
    expect(shouldTouch(10_000, 5_000)).toBe(false);
  });
});

describe('TouchThrottle', () => {
  it('lets one write per user per minute through, users apart', () => {
    const t = new TouchThrottle();
    expect(t.take('a', 0)).toBe(true);
    expect(t.take('a', 30_000)).toBe(false);
    expect(t.take('b', 30_000)).toBe(true);
    expect(t.take('a', TOUCH_EVERY_MS)).toBe(true);
    expect(t.take('a', TOUCH_EVERY_MS + 1)).toBe(false);
  });

  it('stays bounded, forgetting the oldest user first', () => {
    const t = new TouchThrottle(2);
    t.take('a', 0);
    t.take('b', 1);
    t.take('c', 2);
    expect(t.size).toBe(2);
    expect(t.take('a', 3)).toBe(true);
    expect(t.take('c', 4)).toBe(false);
  });
});
