import { describe, expect, it } from 'vitest';
import { LineHolds } from './line-holds';

// The line hold's length comes from the line's own history, never from the probe row's age.

const MIN = 60_000;
const T0 = new Date('2026-10-30T08:00:00Z');
const at = (min: number) => new Date(T0.getTime() + min * MIN);

describe('LineHolds', () => {
  it('first hold 30 min, then doubled at each renewal up to 6 h', () => {
    const h = new LineHolds();
    const lengths: number[] = [];
    let now = T0;
    for (let i = 0; i < 6; i += 1) {
      const set = h.hold('k', now);
      lengths.push((set.until - now.getTime()) / MIN);
      now = new Date(set.until + MIN);
    }
    expect(lengths).toEqual([30, 60, 120, 240, 360, 360]);
  });

  it('a 131042 while the line is held renews nothing', () => {
    const h = new LineHolds();
    const first = h.hold('k', T0);
    expect(h.hold('k', at(10))).toEqual({ until: first.until, prev: null, fresh: false });
  });

  it('a renewal reports the previous end (its deferred rows move); a new episode does not', () => {
    const h = new LineHolds();
    const first = h.hold('k', T0);
    expect(h.hold('k', at(31)).prev).toBe(first.until);
    h.lift('k');
    expect(h.hold('k', at(100))).toMatchObject({ prev: null, until: at(130).getTime() });
  });

  it('no probe within 6 h of the hold end: the next 131042 starts at 30 min again', () => {
    const h = new LineHolds();
    h.hold('k', T0);
    h.hold('k', at(31));
    expect(h.hold('k', at(91 + 6 * 60 + 1)).until).toBe(at(91 + 6 * 60 + 31).getTime());
  });

  it('heldUntil while held; the history survives the end; lift forgets it; keys are separate', () => {
    const h = new LineHolds();
    const { until } = h.hold('a', T0);
    expect(h.heldUntil('a', at(5))).toBe(until);
    expect(h.heldUntil('b', at(5))).toBeNull();
    expect(h.heldUntil('a', at(30))).toBeNull();
    expect(h.hold('a', at(30)).fresh).toBe(true);
    expect(h.lift('a')).toBe(at(90).getTime());
    expect(h.heldUntil('a', at(31))).toBeNull();
    expect(h.lift('a')).toBeNull();
  });
});
