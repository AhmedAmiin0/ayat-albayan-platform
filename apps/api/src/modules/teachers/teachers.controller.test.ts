import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { AvailabilityQueries } from './availability/availability.queries';
import { TeachersModule } from './teachers.module';
import { TeachersQueries } from './teachers.queries';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const teachers = {
  list: vi.fn(),
  get: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  idByProfile: vi.fn(),
};
const VALID = {
  display_name_ar: 'أ. سارة',
  gender: 'female',
  programs: ['quran'],
  phone_e164: '01001234567',
  tz: 'Africa/Cairo',
  rate_30: 60,
};

describe('TeachersController (R-TCH-01)', () => {
  let app: NestFastifyApplication;
  const call = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, payload, headers: { authorization: 'Bearer admin' } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule, TeachersModule] })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .overrideProvider(TeachersQueries)
      .useValue(teachers)
      .overrideProvider(AvailabilityQueries)
      .useValue({})
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => vi.resetAllMocks());

  it('is admin-only: a teacher gets 403', async () => {
    const res = await app.inject({ url: '/teachers', headers: { authorization: 'Bearer teacher' } });
    expect(res.statusCode).toBe(403);
  });

  it('lists with default pagination and returns the page envelope (R-NFR-08)', async () => {
    teachers.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
    const res = await call('GET', '/teachers');
    expect(res.statusCode).toBe(200);
    expect(teachers.list).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
    expect(res.json()).toEqual({ items: [], total: 0, page: 1, pageSize: 25 });
  });

  it('passes ?search through, trimmed', async () => {
    teachers.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
    expect((await call('GET', `/teachers?search=${encodeURIComponent(' ٠١٠ ')}`)).statusCode).toBe(200);
    expect(teachers.list).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, search: '٠١٠' });
  });

  it('rejects a page size above 100', async () => {
    expect((await call('GET', '/teachers?pageSize=500')).statusCode).toBe(400);
  });

  it('creates with an E.164 phone, default status and created_by', async () => {
    teachers.insert.mockImplementation(async (row: object) => ({ id: ID, ...row }));
    const res = await call('POST', '/teachers', VALID);
    expect(res.statusCode).toBe(201);
    expect(teachers.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        phone_e164: '+201001234567',
        status: 'active',
        created_by: USERS['admin']?.id,
      }),
    );
  });

  it('returns 400 with the phone reason for a bad phone', async () => {
    const res = await call('POST', '/teachers', { ...VALID, phone_e164: '@ayat' });
    expect(res.statusCode).toBe(400);
    expect(res.json().issues).toEqual([{ path: 'phone_e164', message: 'not_a_number' }]);
    expect(teachers.insert).not.toHaveBeenCalled();
  });

  it('PATCH sends only the fields the client sent (no status reset)', async () => {
    teachers.update.mockResolvedValue({ id: ID });
    expect((await call('PATCH', `/teachers/${ID}`, { rate_60: 120 })).statusCode).toBe(200);
    expect(teachers.update).toHaveBeenCalledWith(ID, { rate_60: 120 });
  });

  it('PATCH of an unknown teacher is 404', async () => {
    teachers.update.mockResolvedValue(null);
    expect((await call('PATCH', `/teachers/${ID}`, { rate_60: 120 })).statusCode).toBe(404);
  });

  it('GET by id: 400 for a non-uuid, 404 when missing', async () => {
    teachers.get.mockResolvedValue(null);
    expect((await call('GET', '/teachers/abc')).statusCode).toBe(400);
    expect((await call('GET', `/teachers/${ID}`)).statusCode).toBe(404);
  });

  it('DELETE: 204 when removed, 404 when missing', async () => {
    teachers.remove.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await call('DELETE', `/teachers/${ID}`)).statusCode).toBe(204);
    expect((await call('DELETE', `/teachers/${ID}`)).statusCode).toBe(404);
  });
});
