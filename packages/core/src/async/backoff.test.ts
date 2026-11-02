import { describe, expect, it } from 'vitest';
import { backoffDelay, withJitter } from './retry.js';

const curve = { baseMs: 1_000, factor: 3, capMs: 20_000 };

describe('backoffDelay — exponential, capped', () => {
  it.each([
    [0, 1_000],
    [1, 3_000],
    [2, 9_000],
    [3, 20_000],
    [50, 20_000],
  ])('step %i waits %i ms', (step, ms) => {
    expect(backoffDelay(step, curve)).toBe(ms);
  });

  it('counts a negative step as the first one', () => {
    expect(backoffDelay(-4, curve)).toBe(1_000);
  });
});

describe('withJitter — ±50 %', () => {
  it.each([
    [0, 500],
    [0.5, 1_000],
    [0.9999, 1_500],
  ])('random %f → %i ms', (r, ms) => {
    expect(withJitter(1_000, () => r)).toBe(ms);
  });

  it('rounds to the millisecond', () => {
    expect(withJitter(3, () => 0.25)).toBe(2);
  });

  it('defaults to Math.random, inside the band', () => {
    const ms = withJitter(1_000);
    expect(ms).toBeGreaterThanOrEqual(500);
    expect(ms).toBeLessThanOrEqual(1_500);
  });
});
