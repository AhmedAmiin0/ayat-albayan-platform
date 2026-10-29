import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AuditModule } from '../../../common/audit/audit.service';
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
    const mod = await Test.createTestingModule({ imports: [DbModule, AuditModule, AuthModule, GuardiansModule] })
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

  it('DELETE /guardians/:id/phones/:phone removes the SECOND number only (an encoded +), audited, 204', async () => {
    const before = fake.calls.length;
    results['guardian_phones'] = [{ data: [{ phone_e164: '+966552220000' }] }];
    results['audit_log'] = [{ data: null }];
    expect((await send({ method: 'DELETE', url: `/guardians/${ID}${SECOND}`, token: 'admin' })).statusCode).toBe(204);
    const calls = fake.calls.slice(before);
    const eqs = calls.filter((c) => c.table === 'guardian_phones' && c.method === 'eq').map((c) => c.args);
    expect(eqs).toEqual([['guardian_id', ID], ['phone_e164', '+966552220000'], ['is_primary', false]]);
    const audit = calls.find((c) => c.table === 'audit_log' && c.method === 'insert')?.args[0];
    expect(audit).toMatchObject({ actor_id: 'u1', entity: 'guardians', entity_id: ID, action: 'phone_removed', before: { phone_e164: '+966552220000' } });
  });

  it('the main number, or a number of no row → 404 phone_not_found, nothing audited', async () => {
    const before = fake.calls.length;
    results['guardian_phones'] = [{ data: [] }];
    const res = await send({ method: 'DELETE', url: `/guardians/${ID}${SECOND}`, token: 'admin' });
    expect([res.statusCode, res.json().code]).toEqual([404, 'phone_not_found']);
    expect(fake.calls.slice(before).some((c) => c.table === 'audit_log')).toBe(false);
  });

  it('a phone that is not a number → 400 validation_failed, the DB is never touched', async () => {
    const before = fake.calls.length;
    const res = await send({ method: 'DELETE', url: `/guardians/${ID}/phones/abc`, token: 'admin' });
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(fake.calls.length).toBe(before);
  });
});
