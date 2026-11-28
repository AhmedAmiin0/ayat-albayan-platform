import { describe, expect, it } from 'vitest';
import { healthRoutes as routes } from './health.routes';

const checks = {
  database: { status: 'ok', ms: 1 },
  redis: { status: 'off' },
  jobs: { status: 'ok', stale: 0 },
};

describe('healthRoutes', () => {
  it('keeps the paths of today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual(['GET /health', 'GET /ready']);
  });

  it('leaves the two probes open under the health tag', () => {
    for (const route of [routes.health, routes.ready]) {
      expect(route.tags).toEqual(['health']);
      expect(route.isPublic).toBe(true);
      expect(route).not.toHaveProperty('permissions');
    }
  });

  it('answers liveness with the store, and refuses an unknown driver or state', () => {
    const live = { status: 'ok', storage: { driver: 'minio', status: 'down' } };
    expect(routes.health.response.parse(live)).toEqual(live);
    const bad = [
      { driver: 's3', status: 'ok' },
      { driver: 'supabase', status: 'slow' },
    ];
    for (const storage of bad) {
      expect(routes.health.response.safeParse({ status: 'ok', storage }).success).toBe(false);
    }
  });

  it('answers readiness with its checks, and refuses a negative stale count', () => {
    const view = { status: 'degraded', checks };
    expect(routes.ready.response.parse(view)).toEqual(view);
    const stale = { ...checks, jobs: { status: 'ok', stale: -1 } };
    expect(routes.ready.response.safeParse({ ...view, checks: stale }).success).toBe(false);
  });
});
