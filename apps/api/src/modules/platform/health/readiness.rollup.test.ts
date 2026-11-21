import type { ReadinessChecks } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { httpStatusOf, rollup } from './readiness.rollup';

const all = (over: Partial<ReadinessChecks> = {}): ReadinessChecks => ({
  database: { status: 'ok', ms: 3 },
  redis: { status: 'ok' },
  jobs: { status: 'ok', stale: 0 },
  ...over,
});

describe('rollup (the worst check wins; off counts as ok)', () => {
  it('everything ok, or not configured → ok', () => {
    expect(rollup(all())).toBe('ok');
    expect(rollup(all({ redis: { status: 'off' }, jobs: { status: 'off', stale: 0 } }))).toBe('ok');
  });

  it('a Redis failure or a stale job → degraded', () => {
    expect(rollup(all({ redis: { status: 'degraded' } }))).toBe('degraded');
    expect(rollup(all({ jobs: { status: 'degraded', stale: 2 } }))).toBe('degraded');
  });

  it('the database down → down, whatever else', () => {
    expect(rollup(all({ database: { status: 'down', ms: 2000 }, redis: { status: 'degraded' } }))).toBe('down');
  });

  it('only down answers 503', () => {
    expect([httpStatusOf('ok'), httpStatusOf('degraded'), httpStatusOf('down')]).toEqual([200, 200, 503]);
  });
});
