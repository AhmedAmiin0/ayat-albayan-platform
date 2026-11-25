import { describe, expect, it } from 'vitest';
import { jobBeatsSchema, jobStatusListSchema, readinessSchema } from './readiness';

const checks = {
  database: { status: 'ok', ms: 4 },
  redis: { status: 'off' },
  jobs: { status: 'ok', stale: 0 },
};

describe('readinessSchema (GET /ready, docs/09 «Readiness»)', () => {
  it('reads the answer the API gives', () => {
    expect(readinessSchema.parse({ status: 'ok', checks })).toEqual({ status: 'ok', checks });
  });

  it.each(['ok', 'degraded', 'down'])('status %s is one of the three', (status) => {
    expect(readinessSchema.safeParse({ status, checks }).success).toBe(true);
  });

  it('refuses an unknown status, a missing check or a negative count', () => {
    expect(readinessSchema.safeParse({ status: 'fine', checks }).success).toBe(false);
    const { redis: _r, ...noRedis } = checks;
    expect(readinessSchema.safeParse({ status: 'ok', checks: noRedis }).success).toBe(false);
    const bad = { ...checks, jobs: { status: 'ok', stale: -1 } };
    expect(readinessSchema.safeParse({ status: 'ok', checks: bad }).success).toBe(false);
  });
});

describe('jobBeatsSchema (what the worker stores, epoch ms from its clock)', () => {
  const beat = { name: 'RemindersJob', everyMs: 300_000, since: 1, lastOkAt: null, lastErrorAt: null, lastError: null };

  it('reads a beat list, never-run jobs included', () => {
    expect(jobBeatsSchema.parse([beat])).toEqual([beat]);
  });

  it('refuses a zero interval, a blank name and an over-long error', () => {
    expect(jobBeatsSchema.safeParse([{ ...beat, everyMs: 0 }]).success).toBe(false);
    expect(jobBeatsSchema.safeParse([{ ...beat, name: '' }]).success).toBe(false);
    expect(jobBeatsSchema.safeParse([{ ...beat, lastError: 'x'.repeat(501) }]).success).toBe(false);
  });
});

describe('jobStatusListSchema (GET /admin/jobs)', () => {
  it('snake_case rows with ISO times and the stale flag', () => {
    const row = {
      name: 'RemindersJob',
      every_ms: 300_000,
      last_ok_at: '2026-11-21T10:00:00.000Z',
      last_error_at: null,
      last_error: null,
      stale: false,
    };
    expect(jobStatusListSchema.parse({ data: [row] })).toEqual({ data: [row] });
    expect(jobStatusListSchema.safeParse({ data: [{ ...row, last_ok_at: 'today' }] }).success).toBe(false);
  });
});
