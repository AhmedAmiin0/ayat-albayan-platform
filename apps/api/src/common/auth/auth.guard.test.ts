import { Controller, Get } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, TOKEN_VERIFIER, type TokenVerifier } from './auth.guard';
import { Permissions } from './decorators';
import { systemResolver, type PermissionResolver } from './permissions';
import type { AuthUser } from './verify-token';

@Controller('payments-probe')
@Permissions('payments.read')
class ProbeController {
  @Get()
  get() {
    return { ok: true };
  }
}

const USERS: Record<string, AuthUser> = {
  'admin-token': { id: 'a1', email: 'admin@x.com', role: 'admin' },
  'teacher-token': { id: 't1', email: 't@x.com', role: 'teacher' },
  'accountant-token': { id: 'c1', email: 'c@x.com', role: 'admin' },
  'norole-token': { id: 'n1', email: null, role: null },
};
const fakeVerify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
// The accountant holds a custom role (base admin) with payments.read only.
const resolver: PermissionResolver = async (user) => (user.id === 'c1' ? ['payments.read'] : systemResolver(user));

describe('AuthGuard + routes (R-AUTH-01, R-NFR-07, dynamic roles)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env['SUPABASE_URL'] ??= 'http://127.0.0.1:54321';
    const mod = await Test.createTestingModule({ imports: [AppModule], controllers: [ProbeController] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(resolver)
      .overrideProvider(TOKEN_VERIFIER).useValue(fakeVerify)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());

  const get = (url: string, token?: string) =>
    app.inject({ method: 'GET', url, headers: token ? { authorization: `Bearer ${token}` } : {} });

  it('GET /health is public', async () => {
    const res = await get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /auth/me without a token is 401', async () => {
    expect((await get('/auth/me')).statusCode).toBe(401);
  });

  it('GET /auth/me with an invalid token is 401', async () => {
    expect((await get('/auth/me', 'nope')).statusCode).toBe(401);
  });

  it('GET /auth/me returns the verified user and their permissions', async () => {
    const res = await get('/auth/me', 'accountant-token');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ...USERS['accountant-token'], permissions: ['payments.read'] });
  });

  it('GET /auth/me answers a user without a role, with no permissions', async () => {
    const res = await get('/auth/me', 'norole-token');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ role: null, permissions: [] });
  });

  it('@Permissions blocks a role without the permission with 403 and admits one with it', async () => {
    expect((await get('/payments-probe', 'teacher-token')).statusCode).toBe(403);
    expect((await get('/payments-probe', 'norole-token')).statusCode).toBe(403);
    expect((await get('/payments-probe', 'admin-token')).statusCode).toBe(200);
    expect((await get('/payments-probe', 'accountant-token')).statusCode).toBe(200);
  });

  it('a custom role is held to its grants, not to its base role', async () => {
    expect((await get('/students', 'accountant-token')).statusCode).toBe(403);
    expect((await get('/settings', 'accountant-token')).statusCode).toBe(403);
  });
});
