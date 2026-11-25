import { describe, expect, it } from 'vitest';
import { clampPosition, formatClock, PLAYER_SPEEDS, progressOf, skipBy, speedLabel } from '.';

describe('speeds', () => {
  it('offers 1×, 1.5× and 2×', () => {
    expect(PLAYER_SPEEDS.map(speedLabel)).toEqual(['1×', '1.5×', '2×']);
  });
});

describe('skipBy / clampPosition', () => {
  it('moves 10 s and stays within the file', () => {
    expect(skipBy({ position: 30, duration: 100, delta: 10 })).toBe(40);
    expect(skipBy({ position: 5, duration: 100, delta: -10 })).toBe(0);
    expect(skipBy({ position: 95, duration: 100, delta: 10 })).toBe(100);
  });

  it('only floors at 0 while the length is unknown, and drops a bad number', () => {
    expect(clampPosition(500, 0)).toBe(500);
    expect(clampPosition(Number.NaN, 100)).toBe(0);
  });
});

describe('formatClock', () => {
  it('writes m:ss under an hour and h:mm:ss above', () => {
    expect(formatClock(760)).toBe('12:40');
    expect(formatClock(9)).toBe('0:09');
    expect(formatClock(3909)).toBe('1:05:09');
    expect(formatClock(Number.POSITIVE_INFINITY)).toBe('0:00');
  });
});

describe('progressOf', () => {
  it('is the share heard, 0 while unknown', () => {
    expect(progressOf(25, 100)).toBe(0.25);
    expect(progressOf(25, 0)).toBe(0);
  });
});
