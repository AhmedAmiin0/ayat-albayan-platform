import { Controller, Get } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { featureRoot } from '@/common/infra/test-root';
import { StudentsModule } from '@/modules/people/students';
import { HealthModule } from '@/modules/platform/health';
import { PERMISSION_RESOLVER, TOKEN_VERIFIER, type TokenVerifier } from './auth.guard';
import { Permissions } from './decorators';
import { MeZoneRepo } from './me-zone.repo';
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

const uuid = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const [ADMIN, TEACHER, ACCOUNTANT] = [uuid(1), uuid(2), uuid(3)];
const USERS: Record<string, AuthUser> = {
  'admin-token': { id: ADMIN, email: 'admin@x.com', role: 'admin' },
  'teacher-token': { id: TEACHER, email: 't@x.com', role: 'teacher' },
  'accountant-token': { id: ACCOUNTANT, email: 'c@x.com', role: 'admin' },
  'norole-token': { id: uuid(4), email: null, role: null },
  'off-schema-token': { id: 'not-a-uuid', email: null, role: null },
};
const fakeVerify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
// The accountant holds a custom role (base admin) with payments.read only.
// The teacher is a test account (profiles.is_test, read by the resolver from the database).
const resolver: PermissionResolver = Object.assign(
  async (user: AuthUser) => (user.id === ACCOUNTANT ? ['payments.read' as const] : systemResolver(user)),
  { isTest: async (user: AuthUser) => user.id === TEACHER },
);

describe('AuthGuard + routes (R-AUTH-01, R-NFR-07, dynamic roles)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.SUPABASE_URL ??= 'http://127.0.0.1:54321';
    const imports = [featureRoot(HealthModule, StudentsModule)];
    const mod = await Test.createTestingModule({ imports, controllers: [ProbeController] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(resolver)
      .overrideProvider(TOKEN_VERIFIER).useValue(fakeVerify)
      .overrideProvider(MeZoneRepo).useValue({
        zoneOf: async (id: string) => (id === ACCOUNTANT ? 'Africa/Cairo' : null),
        localeOf: async (id: string) => (id === ACCOUNTANT ? 'en' : null),
      })
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
    expect(res.json()).toEqual({ status: 'ok', storage: { driver: 'supabase', status: expect.any(String) } });
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
    expect(res.json()).toEqual({
      ...USERS['accountant-token'],
      permissions: ['payments.read'],
      tz: 'Africa/Cairo',
      locale: 'en',
      is_test: false,
    });
  });

  it('GET /auth/me: is_test from the resolver (the database), never from the token', async () => {
    const res = await get('/auth/me', 'teacher-token');
    expect(res.json()).toMatchObject({ is_test: true });
    expect(res.json()).not.toHaveProperty('isTest');
  });

  it('GET /auth/me answers a user without a role, with no permissions', async () => {
    const res = await get('/auth/me', 'norole-token');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ role: null, permissions: [], tz: null, locale: null });
  });

  it('GET /auth/me answers 500 response_invalid when the session does not fit its schema', async () => {
    const res = await get('/auth/me', 'off-schema-token');
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ code: 'response_invalid' });
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
