import { Controller, Get } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { TOKEN_VERIFIER, type TokenVerifier } from './auth.guard';
import { Roles } from './decorators';
import type { AuthUser } from './verify-token';

@Controller('admin-only')
class AdminOnlyController {
  @Roles('admin')
  @Get()
  get() {
    return { ok: true };
  }
}

const USERS: Record<string, AuthUser> = {
  'admin-token': { id: 'a1', email: 'admin@x.com', role: 'admin' },
  'teacher-token': { id: 't1', email: 't@x.com', role: 'teacher' },
};
const fakeVerify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

describe('AuthGuard + routes (R-AUTH-01, R-NFR-07)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env['SUPABASE_URL'] ??= 'http://127.0.0.1:54321';
    const mod = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AdminOnlyController],
    })
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(fakeVerify)
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

  it('GET /auth/me returns the verified user', async () => {
    const res = await get('/auth/me', 'admin-token');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(USERS['admin-token']);
  });

  it('@Roles blocks other roles with 403 and admits the role', async () => {
    expect((await get('/admin-only', 'teacher-token')).statusCode).toBe(403);
    expect((await get('/admin-only', 'admin-token')).statusCode).toBe(200);
  });
});
