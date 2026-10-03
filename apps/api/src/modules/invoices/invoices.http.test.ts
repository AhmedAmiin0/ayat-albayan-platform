import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { StorageService } from '../../common/storage/storage.service';
import { InvoicesQueries, type InvoiceRowOut } from './invoices.queries';

const RULE = 'e1111111-1111-4111-8111-111111111111';
const STUDENT = 'e2222222-2222-4222-8222-222222222222';
const INV = 'e3333333-3333-4333-8333-333333333333';
const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 't1', email: null, role: 'teacher' },
  guardian: { id: 'g1', email: null, role: 'guardian' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const row = (over: Partial<InvoiceRowOut> = {}): InvoiceRowOut => ({
  id: INV,
  rule_id: RULE,
  kind: 'package',
  storage_path: `${RULE}/a.png`,
  mime: 'image/png',
  size_bytes: 2048,
  source: 'upload',
  created_at: '2026-10-03 09:00:00+00',
  students: [{ id: STUDENT, name: 'سهيلة', code: 'AB-0183' }],
  ...over,
});

describe('invoice routes (R-PAY-03): admin only', () => {
  let app: NestFastifyApplication;
  const queries = { byRules: vi.fn(), get: vi.fn(), ruleIdsOf: vi.fn() };
  const storage = { signedDownload: vi.fn() };
  const call = (url: string, token = 'admin') =>
    app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(InvoicesQueries).useValue(queries)
      .overrideProvider(StorageService).useValue(storage)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    queries.byRules.mockResolvedValue([row()]);
    queries.get.mockResolvedValue(row());
    storage.signedDownload.mockResolvedValue({ url: 'http://signed', expires_at: 'x' });
  });

  it('a teacher and a guardian get 403 on every route; nothing is read', async () => {
    for (const token of ['teacher', 'guardian']) {
      expect((await call(`/invoices?ruleId=${RULE}`, token)).statusCode).toBe(403);
      expect((await call(`/invoices/${INV}/download`, token)).statusCode).toBe(403);
    }
    expect(queries.byRules).not.toHaveBeenCalled();
    expect(queries.get).not.toHaveBeenCalled();
    expect(storage.signedDownload).not.toHaveBeenCalled();
  });

  it('lists a booking\'s invoices without the storage path', async () => {
    const res = await call(`/invoices?ruleId=${RULE}`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        id: INV,
        rule_id: RULE,
        kind: 'package',
        mime: 'image/png',
        size_bytes: 2048,
        source: 'upload',
        created_at: '2026-10-03T09:00:00.000Z',
        students: [{ id: STUDENT, name: 'سهيلة', code: 'AB-0183' }],
      },
    ]);
    expect(queries.byRules).toHaveBeenCalledWith([RULE]);
    expect(queries.ruleIdsOf).not.toHaveBeenCalled();
  });

  it('lists a student\'s invoices through the bookings they are on', async () => {
    queries.ruleIdsOf.mockResolvedValue([RULE, 'e4444444-4444-4444-8444-444444444444']);
    expect((await call(`/invoices?studentId=${STUDENT}`)).json()).toHaveLength(1);
    expect(queries.byRules).toHaveBeenCalledWith([RULE, 'e4444444-4444-4444-8444-444444444444']);
  });

  it('needs exactly one of ruleId / studentId', async () => {
    expect((await call('/invoices')).statusCode).toBe(400);
    expect((await call(`/invoices?ruleId=${RULE}&studentId=${STUDENT}`)).statusCode).toBe(400);
    expect((await call('/invoices?ruleId=nope')).statusCode).toBe(400);
  });

  it('download: a signed URL for the invoices bucket, saved as «AB-0183_فاتورة.png»', async () => {
    const res = await call(`/invoices/${INV}/download`);
    expect(res.json()).toEqual({ url: 'http://signed', expires_at: 'x' });
    expect(storage.signedDownload).toHaveBeenCalledWith({
      bucket: 'invoices',
      path: `${RULE}/a.png`,
      download: 'AB-0183_فاتورة.png',
    });
  });

  it('download: 404 invoice_not_found', async () => {
    queries.get.mockResolvedValue(null);
    const res = await call(`/invoices/${INV}/download`);
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: 'invoice_not_found' });
  });
});
