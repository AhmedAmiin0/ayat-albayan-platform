import { describe, expect, it } from 'vitest';
import { clampPosition, formatClock, nextSpeed, progressOf, skipBy, speedLabel } from './index.js';

describe('nextSpeed', () => {
  it('cycles 1 → 1.5 → 2 → 1, an unknown speed back to the first step', () => {
    expect([nextSpeed(1), nextSpeed(1.5), nextSpeed(2)]).toEqual([1.5, 2, 1]);
    expect(nextSpeed(3)).toBe(1);
    expect(speedLabel(1.5)).toBe('1.5×');
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
