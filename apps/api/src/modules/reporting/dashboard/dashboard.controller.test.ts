import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { LEAD_STATUSES, LESSON_STATUSES } from '@ab/catalog';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { featureRoot } from '@/common/infra/test-root';
import { DashboardModule } from './dashboard.module';
import {
  PERMISSION_RESOLVER,
  systemResolver,
  TOKEN_VERIFIER,
  type TokenVerifier,
} from '@/common/auth/auth.guard';
import type { AuthUser } from '@/common/auth/verify-token';
import { DashboardService } from './dashboard.service';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const dashboard = { summary: vi.fn(), queue: vi.fn() };
const zeros = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, 0]));
const MONEY = { revenue: 0, teacher_cost: 0, expenses: 0, gross_margin: 0 };
const SUMMARY = {
  range: { from: '2026-10-01', to: '2026-10-02' },
  funnel: zeros(LEAD_STATUSES),
  lessons_by_status: zeros(LESSON_STATUSES),
  ...zeros(['active_students', 'needs_confirmation', 'pending_reports', 'unpaid_subscriptions']),
  open_tasks: 0,
  teacher_load: [],
  finance: {
    ...MONEY,
    currency: 'SAR',
    by_source: [],
    fx_date: null,
    fx_missing: [],
    by_month: [],
    expenses_by_category: {},
    fx_rates: { SAR: 1 },
    unrated_lessons: 0,
  },
};
const EMPTY = { total: 0, items: [] };
const WORK = { pending_reports: EMPTY, unpaid: EMPTY, tasks: EMPTY };

describe('GET /dashboard/* (admin only)', () => {
  let app: NestFastifyApplication;
  const get = (url: string, token = 'admin') =>
    app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [featureRoot(DashboardModule)] })
      .overrideProvider(PERMISSION_RESOLVER)
      .useValue(systemResolver)
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .overrideProvider(DashboardService)
      .useValue(dashboard)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    dashboard.summary.mockResolvedValue(SUMMARY);
    dashboard.queue.mockResolvedValue(WORK);
  });

  it('summary passes the parsed range', async () => {
    const res = await get('/dashboard/summary?from=2026-10-01&to=2026-10-02');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(SUMMARY);
    expect(dashboard.summary).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-02' });
  });

  it('a range over a year is 400 range_too_large; reversed is invalid_range', async () => {
    const long = await get('/dashboard/summary?from=2025-01-01&to=2026-10-02');
    expect(long.statusCode).toBe(400);
    expect(long.json()).toMatchObject({ code: 'range_too_large' });
    expect((await get('/dashboard/summary?from=2026-10-02&to=2026-10-01')).json()).toMatchObject({
      code: 'invalid_range',
    });
    expect(dashboard.summary).not.toHaveBeenCalled();
  });

  it('work returns the queue; teachers and anonymous callers are refused', async () => {
    expect((await get('/dashboard/work')).json()).toEqual(WORK);
    expect((await get('/dashboard/work', 'teacher')).statusCode).toBe(403);
    expect(
      (await get('/dashboard/summary?from=2026-10-01&to=2026-10-02', 'teacher')).statusCode,
    ).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/dashboard/work' })).statusCode).toBe(401);
  });
});
