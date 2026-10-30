import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createThrottle } from './throttle.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('leading + trailing throttle', () => {
  it('a burst of 20 calls runs twice: now and at the end of the window', () => {
    const run = vi.fn();
    const t = createThrottle(run, 1_000);
    for (let i = 0; i < 20; i += 1) t.call();
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_000);
    expect(run).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(5_000);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('a lone call runs once; a call after the window runs at once again', () => {
    const run = vi.fn();
    const t = createThrottle(run, 1_000);
    t.call();
    vi.advanceTimersByTime(1_000);
    expect(run).toHaveBeenCalledTimes(1);
    t.call();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('a call inside the trailing window is held to its end', () => {
    const run = vi.fn();
    const t = createThrottle(run, 1_000);
    t.call();
    t.call();
    vi.advanceTimersByTime(1_000);
    t.call();
    expect(run).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1_000);
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('cancel drops the pending run', () => {
    const run = vi.fn();
    const t = createThrottle(run, 1_000);
    t.call();
    t.call();
    t.cancel();
    vi.advanceTimersByTime(2_000);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
