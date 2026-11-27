import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER } from '@/common/auth/auth.guard';
import type { TokenVerifier } from '@/common/auth/auth.guard';
import { ResponseCheckInterceptor } from '@/common/http/returns';
import { featureRoot } from '@/common/infra/test-root';
import { RolesModule } from './roles.module';
import { RolesService } from './roles.service';

// The role routes as declared: the shared id check and the answers' shape.

const ADMIN = 'a0000000-0000-4000-8000-000000000001';
const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const verify: TokenVerifier = async (token) => {
  if (token !== 'admin') throw new Error('bad token');
  return { id: ADMIN, email: null, role: 'admin' };
};
const role = {
  id: ID,
  key: 'custom-0a1b2c3d',
  name_ar: 'مشرف',
  name_en: null,
  base_role: 'assistant',
  is_system: false,
  permissions: ['students.read'],
  users: 0,
};
const staffUser = { id: ADMIN, full_name: 'سارة', role: 'admin', role_id: ID };
const roles = {
  list: vi.fn(),
  users: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  reset: vi.fn(),
  remove: vi.fn(),
  assign: vi.fn(),
};

describe('role routes', () => {
  let app: NestFastifyApplication;
  const call = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, payload, headers: { authorization: 'Bearer admin' } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [featureRoot(RolesModule)] })
      .overrideProvider(PERMISSION_RESOLVER)
      .useValue(systemResolver)
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .overrideProvider(RolesService)
      .useValue(roles)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalInterceptors(ResponseCheckInterceptor.fromEnv());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => vi.resetAllMocks());

  it.each([
    ['PATCH', '/roles/abc', { name_ar: 'مشرف' }],
    ['POST', '/roles/abc/reset', undefined],
    ['DELETE', '/roles/abc', undefined],
    ['PATCH', '/users/abc/role', { role_id: ID }],
  ] as const)('%s %s → 400 validation_failed', async (method, url, body) => {
    const res = await call(method, url, body);
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(Object.values(roles).some((fn) => fn.mock.calls.length > 0)).toBe(false);
  });

  it('GET /permissions answers the matrix sections as declared', async () => {
    const res = await call('GET', '/permissions');
    expect(res.statusCode).toBe(200);
    expect(res.json()[0]).toMatchObject({ area: 'people' });
  });

  it('GET /roles and /roles/staff-users answer as declared', async () => {
    roles.list.mockResolvedValue([role]);
    roles.users.mockResolvedValue([{ ...staffUser, role_id: '' }]);
    expect((await call('GET', '/roles')).json()).toEqual([role]);
    expect((await call('GET', '/roles/staff-users')).json()).toEqual([
      { ...staffUser, role_id: '' },
    ]);
  });

  it('POST, PATCH and reset answer the role; DELETE answers 204', async () => {
    for (const fn of [roles.create, roles.update, roles.reset]) fn.mockResolvedValue(role);
    const body = { name_ar: 'مشرف', base_role: 'assistant', permissions: ['students.read'] };
    expect((await call('POST', '/roles', body)).statusCode).toBe(201);
    expect((await call('PATCH', `/roles/${ID}`, { name_ar: 'مشرف' })).statusCode).toBe(200);
    expect((await call('POST', `/roles/${ID}/reset`)).statusCode).toBe(200);
    expect((await call('DELETE', `/roles/${ID}`)).statusCode).toBe(204);
    expect(roles.update).toHaveBeenCalledWith(ID, { name_ar: 'مشرف', actorId: ADMIN });
    expect(roles.reset).toHaveBeenCalledWith(ID, ADMIN);
  });

  it('PATCH /users/:id/role assigns the role and answers the staff user', async () => {
    roles.assign.mockResolvedValue(staffUser);
    const res = await call('PATCH', `/users/${ADMIN}/role`, { role_id: ID });
    expect([res.statusCode, res.json()]).toEqual([200, staffUser]);
    expect(roles.assign).toHaveBeenCalledWith({ userId: ADMIN, roleId: ID, actorId: ADMIN });
  });
});
