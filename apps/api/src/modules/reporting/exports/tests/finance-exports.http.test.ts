import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { featureRoot } from '@/common/infra/test-root';
import {
  PERMISSION_RESOLVER,
  systemResolver,
  TOKEN_VERIFIER,
  type TokenVerifier,
} from '@/common/auth/auth.guard';
import type { AuthUser } from '@/common/auth/verify-token';
import { ReceivablesService } from '@/modules/finance/receivables/receivables.service';
import { ExportsModule } from '@/modules/reporting/exports';
import { ExportsQueries } from '@/modules/reporting/exports/exports.queries';
import { FinanceExportsQueries } from '@/modules/reporting/exports/finance-exports.queries';

const TEACHER_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const queries = { expenses: vi.fn(), sessions: vi.fn(), teacherPayments: vi.fn() };
const receivables = { list: vi.fn() };

describe('GET /exports finance CSVs (R-TCH-04)', () => {
  let app: NestFastifyApplication;
  const get = (url: string, token = 'admin') =>
    app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [featureRoot(ExportsModule)] })
      .overrideProvider(PERMISSION_RESOLVER)
      .useValue(systemResolver)
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .overrideProvider(ExportsQueries)
      .useValue({})
      .overrideProvider(FinanceExportsQueries)
      .useValue(queries)
      .overrideProvider(ReceivablesService)
      .useValue(receivables)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    for (const fn of Object.values(queries)) fn.mockResolvedValue([]);
    receivables.list.mockResolvedValue({ rows: [] });
  });

  it('expenses.csv reads one month, or a whole year by its first and last month', async () => {
    const month = await get('/exports/expenses.csv?month=2026-09');
    expect(month.statusCode).toBe(200);
    expect(month.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(month.headers['content-disposition']).toBe(
      'attachment; filename="expenses-2026-09.csv"',
    );
    expect(queries.expenses).toHaveBeenCalledWith('2026-09-01', '2026-09-01');
    const year = await get('/exports/expenses.csv?year=2026');
    expect(year.headers['content-disposition']).toBe('attachment; filename="expenses-2026.csv"');
    expect(queries.expenses).toHaveBeenLastCalledWith('2026-01-01', '2026-12-01');
  });

  it('expenses.csv without a month or a four-digit year is 400 validation_failed', async () => {
    for (const url of ['/exports/expenses.csv', '/exports/expenses.csv?year=26']) {
      const res = await get(url);
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ message: 'validation_failed' });
    }
    expect(queries.expenses).not.toHaveBeenCalled();
  });

  it('teacher-ledger.csv reads the Riyadh month for the teacher asked', async () => {
    const res = await get(`/exports/teacher-ledger.csv?month=2026-09&teacherId=${TEACHER_ID}`);
    expect(res.headers['content-disposition']).toBe(
      'attachment; filename="teacher-ledger-2026-09.csv"',
    );
    const [window, teacher] = queries.sessions.mock.calls[0] ?? [];
    expect(window.from.toISOString()).toBe('2026-08-31T21:00:00.000Z');
    expect(teacher).toBe(TEACHER_ID);
    expect((await get('/exports/teacher-ledger.csv?month=2026-13')).statusCode).toBe(400);
  });

  it('receivables.csv is dated; teachers are refused every finance file', async () => {
    const res = await get('/exports/receivables.csv');
    expect(res.headers['content-disposition']).toMatch(/receivables-\d{4}-\d{2}-\d{2}\.csv/);
    for (const kind of ['expenses', 'teacher-ledger', 'receivables']) {
      expect((await get(`/exports/${kind}.csv?month=2026-09`, 'teacher')).statusCode).toBe(403);
    }
  });
});
