import type { JobBeat } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { isStale, STALE_AFTER_INTERVALS, staleNames } from './staleness';

const every = 60_000;
const beat = (over: Partial<JobBeat> = {}): JobBeat => ({
  name: 'a', everyMs: every, since: 0, lastOkAt: null, lastErrorAt: null, lastError: null, ...over,
});
const limit = STALE_AFTER_INTERVALS * every;

describe('isStale (last success older than N × the interval)', () => {
  it('a job that never succeeded counts from its first due run', () => {
    expect(isStale(beat(), limit)).toBe(false);
    expect(isStale(beat(), limit + 1)).toBe(true);
  });

  it('counts from the last success once there is one', () => {
    const b = beat({ lastOkAt: 10 * every });
    expect(isStale(b, 10 * every + limit)).toBe(false);
    expect(isStale(b, 10 * every + limit + 1)).toBe(true);
  });

  it('an error alone does not make a job fresh', () => {
    expect(isStale(beat({ lastErrorAt: limit }), limit + 1)).toBe(true);
  });

  it('staleNames lists only the stale ones', () => {
    const list = [beat({ name: 'old' }), beat({ name: 'new', lastOkAt: limit })];
    expect(staleNames(list, limit + 1)).toEqual(['old']);
  });
});
