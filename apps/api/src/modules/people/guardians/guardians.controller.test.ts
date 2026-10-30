import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import { AuthModule } from '../../../common/auth/auth.module';
import { DB, DbModule } from '../../../common/db/db.module';
import { fakeDb, type FakeResult } from './fake-db';
import { GuardiansModule } from './guardians.module';

const results: Record<string, FakeResult[]> = {};
const fake = fakeDb(results);
const verify: TokenVerifier = async (token) => ({ id: 'u1', email: null, role: token === 'admin' ? 'admin' : 'teacher' });
const ID = '11111111-1111-4111-8111-111111111111';
const SECOND = '/phones/%2B966552220000';

describe('GuardiansController is admin-only (R-STU-02, R-NFR-02)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [DbModule, AuthModule, GuardiansModule] })
      .overrideProvider(DB)
      .useValue(fake.db)
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    for (const k of Object.keys(results)) results[k] = [];
  });

  const send = (opts: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; url: string; token: string }) =>
    app.inject({ method: opts.method, url: opts.url, headers: { authorization: `Bearer ${opts.token}` } });

  it.each([
    ['GET', '/guardians'],
    ['GET', `/guardians/${ID}`],
    ['POST', '/guardians'],
    ['PATCH', `/guardians/${ID}`],
    ['DELETE', `/guardians/${ID}`],
    ['DELETE', `/guardians/${ID}${SECOND}`],
  ] as const)('a teacher gets 403 on %s %s and the DB is never touched', async (method, url) => {
    const before = fake.calls.length;
    expect((await send({ method, url, token: 'teacher' })).statusCode).toBe(403);
    expect(fake.calls.length).toBe(before);
  });

  it('an admin gets the page (200)', async () => {
    results['guardians'] = [{ data: [], count: 0 }];
    const res = await send({ method: 'GET', url: '/guardians', token: 'admin' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('DELETE /guardians/:id/phones/:phone: remove_family_phone (delete + audit in one transaction), an encoded +, 204', async () => {
    const before = fake.calls.length;
    results['rpc:remove_family_phone'] = [{ data: null }];
    expect((await send({ method: 'DELETE', url: `/guardians/${ID}${SECOND}`, token: 'admin' })).statusCode).toBe(204);
    const calls = fake.calls.slice(before);
    expect(calls.map((c) => c.table)).toEqual(['rpc:remove_family_phone']);
    expect(calls[0]?.args).toEqual([{ p_guardian: ID, p_phone: '+966552220000', p_actor: 'u1' }]);
  });

  it('the main number, or a number of no row (P0001 phone_not_found) → 404 phone_not_found', async () => {
    results['rpc:remove_family_phone'] = [{ error: { code: 'P0001', message: 'phone_not_found' } }];
    const res = await send({ method: 'DELETE', url: `/guardians/${ID}${SECOND}`, token: 'admin' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'phone_not_found']);
  });

  it('a phone that is not a number → 400 validation_failed, the DB is never touched', async () => {
    const before = fake.calls.length;
    const res = await send({ method: 'DELETE', url: `/guardians/${ID}/phones/abc`, token: 'admin' });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(fake.calls.length).toBe(before);
  });
});
