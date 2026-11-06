import { afterEach, describe, expect, it, vi } from 'vitest';
import { onPaceDue, reserveSlot, resetPaceSlots, wakeAt } from './pace-slots';

// Messaging review: a paced backlog spreads over its own slots (never one crowded batch) and the
// sender is woken at the earliest slot, not at the next 30 s poll.

describe('Evolution pace slots', () => {
  afterEach(() => {
    resetPaceSlots();
    vi.useRealTimers();
  });

  it('each deferred row of a number gets the next slot, one gap apart; numbers are apart', () => {
    expect(reserveSlot('n1', { earliest: 10_000, gapMs: 3_000 })).toBe(10_000);
    expect(reserveSlot('n1', { earliest: 10_000, gapMs: 3_000 })).toBe(13_000);
    expect(reserveSlot('n1', { earliest: 10_000, gapMs: 3_000 })).toBe(16_000);
    expect(reserveSlot('n2', { earliest: 10_000, gapMs: 3_000 })).toBe(10_000);
    expect(reserveSlot('n1', { earliest: 50_000, gapMs: 3_000 })).toBe(50_000);
  });

  it('wakes the sender once, at the earliest slot', () => {
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
    expect(kick).toHaveBeenCalledTimes(1);
  });
});
