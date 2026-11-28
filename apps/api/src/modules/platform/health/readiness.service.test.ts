import type { JobBeat } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { MIN_STALE_MS } from '@/common/jobs/beats';
import { ReadinessService, type ReadinessDeps } from './readiness.service';

const NOW = 10_000_000;
const beat = (name: string, lastOkAt: number | null): JobBeat => ({
  name,
  everyMs: 1_000,
  since: NOW - 500,
  lastOkAt,
  lastErrorAt: null,
  lastError: null,
});

function deps(over: Partial<ReadinessDeps> = {}): ReadinessDeps {
  return {
    ping: vi.fn(async () => undefined),
    redis: () => 'ok',
    beats: async () => [beat('a', NOW)],
    now: () => NOW,
    ...over,
  };
}

describe('ReadinessService (GET /ready)', () => {
  it('all well → ok, with how long the database took', async () => {
    const ticks = [NOW, NOW + 7];
    const view = await new ReadinessService(deps({ now: () => ticks.shift() ?? NOW + 7 })).check();
    expect(view).toEqual({
      status: 'ok',
      checks: {
        database: { status: 'ok', ms: 7 },
        redis: { status: 'ok' },
        jobs: { status: 'ok', stale: 0 },
      },
    });
  });

  it('a down or timed-out database → down (the error text is never shown)', async () => {
    const ping = vi.fn(async () => Promise.reject(new Error('timeout: secret host')));
    const view = await new ReadinessService(deps({ ping })).check();
    expect(view.status).toBe('down');
    expect(view.checks.database.status).toBe('down');
    expect(JSON.stringify(view)).not.toContain('secret');
  });

  it('Redis configured but not connected → degraded, never down', async () => {
    const view = await new ReadinessService(deps({ redis: () => 'degraded' })).check();
    expect(view).toMatchObject({ status: 'degraded', checks: { redis: { status: 'degraded' } } });
  });

  it('a stale job → degraded with the count only', async () => {
    const old = NOW - MIN_STALE_MS - 1;
    const view = await new ReadinessService(
      deps({ beats: async () => [beat('a', old), beat('b', NOW)] }),
    ).check();
    expect(view).toMatchObject({
      status: 'degraded',
      checks: { jobs: { status: 'degraded', stale: 1 } },
    });
  });

  it('beats unreadable here (an API copy without Redis) → jobs off', async () => {
    const view = await new ReadinessService(deps({ beats: async () => null })).check();
    expect(view).toMatchObject({ status: 'ok', checks: { jobs: { status: 'off', stale: 0 } } });
  });
});
