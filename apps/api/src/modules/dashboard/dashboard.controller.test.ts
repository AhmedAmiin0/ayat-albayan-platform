import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
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

describe('GET /dashboard/* (admin only)', () => {
  let app: NestFastifyApplication;
  const get = (url: string, token = 'admin') => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(DashboardService).useValue(dashboard)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    dashboard.summary.mockResolvedValue({ range: { from: '2026-10-01', to: '2026-10-02' } });
    dashboard.queue.mockResolvedValue({ pending_reports: { total: 0, items: [] } });
  });

  it('summary passes the parsed range', async () => {
    const res = await get('/dashboard/summary?from=2026-10-01&to=2026-10-02');
    expect(res.statusCode).toBe(200);
    expect(dashboard.summary).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-02' });
  });

  it('a range over a year is 400 range_too_large; reversed is invalid_range', async () => {
    const long = await get('/dashboard/summary?from=2025-01-01&to=2026-10-02');
    expect(long.statusCode).toBe(400);
    expect(long.json()).toMatchObject({ code: 'range_too_large' });
    expect((await get('/dashboard/summary?from=2026-10-02&to=2026-10-01')).json()).toMatchObject({ code: 'invalid_range' });
    expect(dashboard.summary).not.toHaveBeenCalled();
  });

  it('work returns the queue; teachers and anonymous callers are refused', async () => {
    expect((await get('/dashboard/work')).json()).toEqual({ pending_reports: { total: 0, items: [] } });
    expect((await get('/dashboard/work', 'teacher')).statusCode).toBe(403);
    expect((await get('/dashboard/summary?from=2026-10-01&to=2026-10-02', 'teacher')).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/dashboard/work' })).statusCode).toBe(401);
  });
});
