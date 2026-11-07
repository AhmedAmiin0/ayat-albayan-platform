import { describe, expect, it } from 'vitest';
import { leftStuck, leftWatch, oldestLeft } from './left';

const night = (d: string) => new Date(`2026-11-${d}T01:00:00Z`);

describe('objects left by the night cap, watched across nights', () => {
  it('a recording left every night while newer objects come and go: told on the 3rd night', () => {
    let watch = {};
    const nights = [
      ['07', ['wa/a', 'rec/r']],
      ['08', ['wa/b', 'rec/r']],
      ['09', ['wa/c', 'rec/r']],
    ] as const;
    const told = nights.map(([d, left]) => {
      const s = leftWatch(watch, { left, now: night(d) });
      watch = s.left_watch;
      return leftStuck(oldestLeft(s), night(d));
    });
    expect(told).toEqual([false, false, true]);
    expect(oldestLeft({ left_count: 2, left_watch: watch })).toEqual({
      count: 2,
      key: 'rec/r',
      since: night('07').toISOString(),
    });
  });

  it('an object no longer left drops out; nothing left: null, never stuck', () => {
    const s = leftWatch({ 'rec/r': night('01').toISOString() }, { left: [], now: night('09') });
    expect(s).toEqual({ left_count: 0, left_watch: {} });
    expect(oldestLeft(s)).toBeNull();
    expect(leftStuck(oldestLeft(s), night('09'))).toBe(false);
  });

  it('keeps at most 100, the oldest first', () => {
    const left = Array.from({ length: 150 }, (_, i) => `k/${String(i).padStart(3, '0')}`);
    const prev = { 'k/149': night('01').toISOString() };
    const s = leftWatch(prev, { left, now: night('09') });
    expect(s.left_count).toBe(150);
    expect(Object.keys(s.left_watch)).toHaveLength(100);
    expect(oldestLeft(s)?.key).toBe('k/149');
  });
});
