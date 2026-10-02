import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { ExportsQueries } from './exports.queries';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const queries = { students: vi.fn(), lessons: vi.fn(), payments: vi.fn(), payouts: vi.fn() };

describe('GET /exports/*.csv (R-RPT-03)', () => {
  let app: NestFastifyApplication;
  const get = (url: string, token = 'admin') => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(ExportsQueries).useValue(queries)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    for (const fn of Object.values(queries)) fn.mockResolvedValue([]);
  });

  it('lessons.csv: text/csv with a BOM, a dated attachment name, the window in UTC', async () => {
    const res = await get('/exports/lessons.csv?from=2026-10-01&to=2026-10-07');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe('attachment; filename="lessons-2026-10-01_2026-10-07.csv"');
    expect(res.rawPayload.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect(queries.lessons.mock.calls[0]?.[0].from.toISOString()).toBe('2026-09-30T21:00:00.000Z');
  });

  it('students.csv needs no range; payments.csv a valid one', async () => {
    expect((await get('/exports/students.csv')).headers['content-disposition']).toMatch(/students-\d{4}-\d{2}-\d{2}\.csv/);
    const bad = await get('/exports/payments.csv?from=2025-01-01&to=2026-10-01');
    expect(bad.statusCode).toBe(400);
    expect(bad.json()).toMatchObject({ code: 'range_too_large' });
  });

  it('payouts.csv?month reads that month; a bad month is 400 invalid_month', async () => {
    const res = await get('/exports/payouts.csv?month=2026-09');
    expect(res.headers['content-disposition']).toBe('attachment; filename="payouts-2026-09.csv"');
    expect(queries.payouts).toHaveBeenCalledWith('2026-09-01');
    expect((await get('/exports/payouts.csv?month=2026-13')).json()).toMatchObject({ code: 'invalid_month' });
  });

  it('teachers are refused', async () => {
    expect((await get('/exports/students.csv', 'teacher')).statusCode).toBe(403);
  });
});
