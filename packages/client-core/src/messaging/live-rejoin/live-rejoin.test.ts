import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRejoin, isDropped, liveDotState, rejoinDelayMs } from './live-rejoin.js';

beforeEach(() => void vi.useFakeTimers());
afterEach(() => void vi.useRealTimers());

describe('live-rejoin (docs/44 K2)', () => {
  it('the backoff schedule: 1 s, 2 s, 5 s, 10 s, then every 30 s', () => {
    const steps = [1_000, 2_000, 5_000, 10_000, 30_000, 30_000, 30_000];
    expect([0, 1, 2, 3, 4, 5, 50].map(rejoinDelayMs)).toEqual(steps);
  });

  it('CHANNEL_ERROR, TIMED_OUT and CLOSED call for a rejoin; SUBSCRIBED and the rest do not', () => {
    const all = ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED', 'SUBSCRIBED', 'joining'];
    expect(all.map(isDropped)).toEqual([true, true, true, false, false]);
  });

  it('the dot: green on while SUBSCRIBED, off otherwise', () => {
    expect([liveDotState(true), liveDotState(false)]).toEqual(['on', 'off']);
  });

  it('one pending rejoin at a time; now() runs it early; joined() resets the steps', () => {
    const join = vi.fn();
    const r = createRejoin(join);
    r.dropped();
    r.dropped();
    vi.advanceTimersByTime(1_000);
    expect(join).toHaveBeenCalledTimes(1);
    r.dropped();
    r.now();
    expect(join).toHaveBeenCalledTimes(2);
    r.now();
    expect(join).toHaveBeenCalledTimes(2);
    r.joined();
    r.dropped();
    vi.advanceTimersByTime(1_000);
    expect(join).toHaveBeenCalledTimes(3);
  });

  it('cancel drops a pending rejoin', () => {
    const join = vi.fn();
    const r = createRejoin(join);
    r.dropped();
    r.cancel();
    vi.advanceTimersByTime(60_000);
    expect(join).not.toHaveBeenCalled();
  });
});
