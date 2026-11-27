import { describe, expect, it } from 'vitest';
import { jobsStatusRoutes as routes } from './jobs.routes';

const job = {
  name: 'outbox',
  every_ms: 1_000,
  last_ok_at: '2026-11-27T10:00:00.000Z',
  last_error_at: null,
  last_error: null,
  stale: false,
};

describe('jobsStatusRoutes', () => {
  it('keeps the path of today, for settings writers only', () => {
    expect(`${routes.list.method} ${routes.list.path}`).toBe('GET /admin/jobs');
    expect(routes.list.permissions).toEqual(['settings.write']);
    expect(routes.list.tags).toEqual(['settings']);
  });

  it('answers the job rows in their data envelope, times with an offset only', () => {
    expect(routes.list.response.parse({ data: [job] })).toEqual({ data: [job] });
    const bad = { ...job, last_ok_at: '2026-11-27 10:00' };
    expect(routes.list.response.safeParse({ data: [bad] }).success).toBe(false);
  });

  it('refuses a job that runs every zero ms', () => {
    const bad = { ...job, every_ms: 0 };
    expect(routes.list.response.safeParse({ data: [bad] }).success).toBe(false);
  });
});
