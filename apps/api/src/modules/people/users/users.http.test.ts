import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { AuditService } from '../../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import { AccountDisabledError, type PermissionResolver } from '../../../common/auth/permissions';
import type { AuthUser } from '../../../common/auth/verify-token';
import { FakeRoleStore } from '../roles/roles.fakes';
import { ROLE_STORE } from '../roles/roles.store';
import { FakeAuthAdmin, FakeUserStore, row } from './users.fakes';
import { AUTH_ADMIN, USER_STORE } from './store/users.store';

const user = (id: string, role: AuthUser['role']): AuthUser => ({ id, email: null, role });
const USERS: Record<string, AuthUser> = {
  admin: user('admin1', 'admin'),
  teacher: user('t1', 'teacher'),
  sales: user('sales1', 'sales'),
  assistant: user('as1', 'assistant'),
  guardian: user('g1', 'guardian'),
  student: user('s1', 'student'),
  reader: user('reader1', 'admin'),
  gone: user('gone1', 'admin'),
};
/** `reader` is a custom admin-base role that holds users.read only; `gone` has a disabled profile. */
const resolver: PermissionResolver = async (u) => {
  if (u.id === 'gone1') throw new AccountDisabledError();
  return u.id === 'reader1' ? ['users.read'] : systemResolver(u);
};
const verify: TokenVerifier = async (token) => {
  const found = USERS[token];
  if (!found) throw new Error('bad token');
  return found;
};

describe('users routes through the real guards', () => {
  const store = new FakeUserStore([row('admin1', 'admin'), row('t1', 'teacher')]);
  const auth = new FakeAuthAdmin();
  const audit = { record: vi.fn() };
  let app: NestFastifyApplication;
  const call = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, opts: { token?: string; payload?: object } = {}) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${opts.token ?? 'admin'}` }, ...(opts.payload && { payload: opts.payload }) });
  const body = { email: 'new@example.com', full_name: 'علي أحمد', role: 'sales', credential: 'generate' };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(PERMISSION_RESOLVER).useValue(resolver)
      .overrideProvider(USER_STORE).useValue(store)
      .overrideProvider(AUTH_ADMIN).useValue(auth)
      .overrideProvider(ROLE_STORE).useValue(new FakeRoleStore())
      .overrideProvider(AuditService).useValue(audit)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    audit.record.mockReset();
    store.rows = [row('admin1', 'admin'), row('t1', 'teacher')];
    store.refs = {};
    auth.users.clear();
  });

  it('admin lists, creates (secret returned once, never cached) and reads', async () => {
    const list = await call('GET', '/users?pageSize=10');
    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({ total: 2, page: 1, pageSize: 10 });
    const created = await call('POST', '/users', { payload: body });
    expect(created.statusCode).toBe(201);
    expect(created.headers['cache-control']).toBe('no-store');
    expect(created.json().credential.kind).toBe('password');
  });

  it.each(['teacher', 'sales', 'assistant', 'guardian', 'student'])('refuses %s everywhere (403)', async (token) => {
    const id = '0b6a0f9e-4a3a-4c1c-8c2e-5d7a3b1f9e11';
    const results = await Promise.all([
      call('GET', '/users', { token }),
      call('GET', `/users/${id}`, { token }),
      call('GET', '/users/role-options', { token }),
      call('GET', '/users/link-candidates?kind=student', { token }),
      call('POST', '/users', { token, payload: body }),
      call('PATCH', `/users/${id}`, { token, payload: { full_name: 'خالد علي' } }),
      call('POST', `/users/${id}/disable`, { token, payload: {} }),
      call('DELETE', `/users/${id}`, { token }),
    ]);
    expect(results.map((r) => r.statusCode)).toEqual(Array(8).fill(403));
    expect(auth.users.size).toBe(0);
  });

  it('a custom role with only users.read can list but not write', async () => {
    const id = '0b6a0f9e-4a3a-4c1c-8c2e-5d7a3b1f9e11';
    expect((await call('GET', '/users', { token: 'reader' })).statusCode).toBe(200);
    expect((await call('GET', '/users/role-options', { token: 'reader' })).statusCode).toBe(200);
    const writes = await Promise.all([
      call('POST', '/users', { token: 'reader', payload: body }),
      call('PATCH', `/users/${id}`, { token: 'reader', payload: { full_name: 'خالد علي' } }),
      call('POST', `/users/${id}/reset-password`, { token: 'reader', payload: {} }),
      call('POST', `/users/${id}/sign-out`, { token: 'reader' }),
      call('GET', '/users/link-candidates?kind=teacher', { token: 'reader' }),
    ]);
    expect(writes.map((r) => r.statusCode)).toEqual([403, 403, 403, 403, 403]);
  });

  it('a disabled profile is refused with 403 account_disabled although its token is valid', async () => {
    const res = await call('GET', '/users', { token: 'gone' });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ code: 'account_disabled' });
  });

  it('answers 409 users_has_history with the references, 204 without history', async () => {
    store.rows.push(row('0b6a0f9e-4a3a-4c1c-8c2e-5d7a3b1f9e11', 'sales'));
    const id = '0b6a0f9e-4a3a-4c1c-8c2e-5d7a3b1f9e11';
    store.refs[id] = [{ ref_table: 'payments', ref_column: 'recorded_by', kind: 'history', n: 2 }];
    const refused = await call('DELETE', `/users/${id}`);
    expect(refused.statusCode).toBe(409);
    expect(refused.json()).toMatchObject({ code: 'users_has_history', references: [{ table: 'payments', count: 2 }], hint: 'disable_instead' });
    store.refs = {};
    expect((await call('DELETE', `/users/${id}`)).statusCode).toBe(204);
  });

  it('validates bodies and ids (400)', async () => {
    expect((await call('POST', '/users', { payload: { ...body, email: 'nope' } })).statusCode).toBe(400);
    expect((await call('POST', '/users', { payload: { ...body, role: 'student' } })).statusCode).toBe(400);
    expect((await call('PATCH', '/users/not-a-uuid', { payload: { full_name: 'خالد علي' } })).statusCode).toBe(400);
    expect((await call('GET', '/users?role=owner')).statusCode).toBe(400);
  });
});
