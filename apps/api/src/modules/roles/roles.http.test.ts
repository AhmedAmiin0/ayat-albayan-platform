import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import { PermissionResolver, type ResolvedAccess } from '../../common/auth/permission-resolver';
import type { AuthUser } from '../../common/auth/verify-token';
import { RolesService } from './roles.service';

const ID = 'a0000000-0000-4000-8000-000000000001';
const USERS: Record<string, AuthUser> = {
  admin: { id: ID, email: null, role: 'admin' },
  teacher: { id: 'b0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const roles = { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), duplicate: vi.fn(), remove: vi.fn() };
const grant = (...p: string[]): ResolvedAccess => ({ roleKey: 'x', permissions: new Set(p), fullName: null, locale: null, tz: null });

describe('/roles (admin base role + roles.view / roles.manage)', () => {
  let app: NestFastifyApplication;
  const call = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, token = 'admin') =>
    app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, ...(method === 'POST' || method === 'PATCH' ? { payload: {} } : {}) });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(RolesService).useValue(roles)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  afterEach(() => vi.restoreAllMocks());

  it('the wildcard admin lists roles', async () => {
    roles.list.mockResolvedValue([]);
    expect((await call('GET', '/roles')).statusCode).toBe(200);
  });

  it('a custom role with roles.view reads but cannot write', async () => {
    vi.spyOn(PermissionResolver.prototype, 'resolve').mockResolvedValue(grant('roles.view'));
    roles.list.mockResolvedValue([]);
    expect((await call('GET', '/roles')).statusCode).toBe(200);
    const res = await call('POST', '/roles');
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ message: 'missing_permission', permission: 'roles.manage' });
    expect((await call('DELETE', `/roles/${ID}`)).statusCode).toBe(403);
    expect(roles.create).not.toHaveBeenCalled();
  });

  it('a custom role with roles.manage can write', async () => {
    vi.spyOn(PermissionResolver.prototype, 'resolve').mockResolvedValue(grant('roles.manage'));
    roles.duplicate.mockResolvedValue({ id: 'n' });
    expect((await call('POST', `/roles/${ID}/duplicate`)).statusCode).toBe(201);
  });

  it('a custom role without any roles permission is refused, and so is a teacher', async () => {
    vi.spyOn(PermissionResolver.prototype, 'resolve').mockResolvedValue(grant('students.manage'));
    expect((await call('GET', '/roles')).statusCode).toBe(403);
    expect((await call('GET', '/roles', 'teacher')).statusCode).toBe(403);
  });

  it('a bad id is 400 before the service runs', async () => {
    expect((await call('GET', '/roles/not-a-uuid')).statusCode).toBe(400);
  });
});
