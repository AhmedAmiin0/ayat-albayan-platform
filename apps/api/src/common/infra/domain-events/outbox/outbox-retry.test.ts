import { describe, expect, it } from 'vitest';
import { MAX_ATTEMPTS, retryDelayMs, settleFailure } from './outbox-retry';

const NOW = new Date('2026-11-23T08:00:00Z');
const row = (attempts: number) => ({ id: 'e-1', attempts });
const fixed = { maxAttempts: 3, delayMs: () => 5_000, now: () => NOW };

describe('retryDelayMs', () => {
  it.each([
    [1, 10_000],
    [2, 20_000],
    [3, 40_000],
    [8, 900_000],
    [20, 900_000],
  ])('attempt %i waits %i ms before jitter (doubling, capped at 15 min)', (attempt, ms) => {
    expect(retryDelayMs(attempt, () => 0.5)).toBe(ms);
  });

  it('spreads a burst ±50 %', () => {
    expect(retryDelayMs(1, () => 0)).toBe(5_000);
    expect(retryDelayMs(1, () => 1)).toBe(15_000);
  });

  it('parks after eight attempts by default', () => {
    expect(MAX_ATTEMPTS).toBe(8);
  });
});

describe('settleFailure', () => {
  it('retries while attempts are left, at now + the delay', () => {
    expect(settleFailure(row(0), 'boom', fixed)).toEqual({
      id: 'e-1',
      state: 'retry',
      at: new Date(NOW.getTime() + 5_000),
      error: 'boom',
    });
  });

  it('parks on the last attempt', () => {
    expect(settleFailure(row(2), 'boom', fixed)).toEqual({
      id: 'e-1',
      state: 'parked',
      at: null,
      error: 'boom',
    });
  });

  it('keeps at most 500 characters of the error', () => {
    expect(settleFailure(row(0), 'x'.repeat(900), fixed).error).toHaveLength(500);
  });
});
