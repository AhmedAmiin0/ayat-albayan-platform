import { afterEach, describe, expect, it, vi } from 'vitest';
import { onPaceDue, reserveSlot, resetPaceSlots, wakeAt } from './pace-slots';

// Messaging review: a paced backlog spreads over its own slots (never one crowded batch) and the
// sender is woken at every slot (re-armed after each), not at the next 30 s poll.

describe('Evolution pace slots', () => {
  afterEach(() => {
    resetPaceSlots();
    vi.useRealTimers();
  });

  const at = (phone: string, earliest = 10_000, now = 0) =>
    ({ earliest, gapMs: 3_000, phone, now });

  it('each deferred recipient of a number gets the next slot, one gap apart; numbers are apart', () => {
    expect(reserveSlot('n1', at('a'))).toBe(10_000);
    expect(reserveSlot('n1', at('b'))).toBe(13_000);
    expect(reserveSlot('n1', at('c'))).toBe(16_000);
    expect(reserveSlot('n2', at('a'))).toBe(10_000);
    expect(reserveSlot('n1', at('d', 50_000))).toBe(50_000);
  });

  it('a recipient keeps its slot while it is ahead; once passed it takes a new one', () => {
    expect(reserveSlot('n1', at('a'))).toBe(10_000);
    expect(reserveSlot('n1', at('b'))).toBe(13_000);
    expect(reserveSlot('n1', at('a', 12_000, 5_000))).toBe(10_000);
    expect(reserveSlot('n1', at('a', 20_000, 10_001))).toBe(20_000);
  });

  it('after each wake-up the next slot is armed: a backlog never waits for the poll', () => {
    vi.useFakeTimers({ now: 0 });
    const kick = vi.fn();
    onPaceDue(kick);
    wakeAt(3_000);
    wakeAt(6_000);
    wakeAt(9_000);
    vi.advanceTimersByTime(3_000);
    expect(kick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3_000);
    expect(kick).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(3_000);
    expect(kick).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(30_000);
    expect(kick).toHaveBeenCalledTimes(3);
  });

  it('wakes the sender once per slot, the earliest first', () => {
    vi.useFakeTimers({ now: 0 });
    const kick = vi.fn();
    onPaceDue(kick);
    wakeAt(5_000);
    wakeAt(3_000);
    wakeAt(4_000);
    vi.advanceTimersByTime(2_999);
    expect(kick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(kick).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(kick).toHaveBeenCalledTimes(3);
  });
});
