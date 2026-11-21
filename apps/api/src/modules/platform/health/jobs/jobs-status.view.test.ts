import { jobStatusListSchema, type JobBeat } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { jobStatusRows } from './jobs-status.view';

const MIN = 60_000;
const beat = (over: Partial<JobBeat>): JobBeat => ({
  name: 'RemindersJob', everyMs: 5 * MIN, since: 0, lastOkAt: null, lastErrorAt: null, lastError: null, ...over,
});

describe('jobStatusRows (GET /admin/jobs)', () => {
  it('ISO times, the stale flag, sorted stale first then by name', () => {
    const now = 60 * MIN;
    const rows = jobStatusRows([
      beat({ name: 'b', lastOkAt: now - MIN }),
      beat({ name: 'a', lastOkAt: now - MIN }),
      beat({ name: 'z', lastOkAt: now - 20 * MIN, lastErrorAt: now - MIN, lastError: 'db timeout' }),
    ], now);
    expect(rows.map((r) => [r.name, r.stale])).toEqual([['z', true], ['a', false], ['b', false]]);
    expect(rows[0]).toEqual({
      name: 'z',
      every_ms: 5 * MIN,
      last_ok_at: new Date(now - 20 * MIN).toISOString(),
      last_error_at: new Date(now - MIN).toISOString(),
      last_error: 'db timeout',
      stale: true,
    });
    expect(jobStatusListSchema.safeParse({ data: rows }).success).toBe(true);
  });

  it('never run, never failed: nulls', () => {
    const [row] = jobStatusRows([beat({})], 0);
    const empty = { last_ok_at: null, last_error_at: null, last_error: null, stale: false };
    expect(row).toMatchObject(empty);
  });
});
