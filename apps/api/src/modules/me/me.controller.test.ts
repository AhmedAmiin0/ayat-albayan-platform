import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { DB } from '../../common/db/db.module';
import { fakeDb, type FakeResult } from '../guardians/fake-db';
import { MeModule } from './me.module';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'admin-1', email: 'a@x.com', role: 'admin' },
  teacher: { id: 'teacher-1', email: 't@x.com', role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

const TOKEN = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const results: Record<string, FakeResult[]> = {};
const fake = fakeDb(results);
let app: NestFastifyApplication;

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule, MeModule] })
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verify)
    .overrideProvider(DB)
    .useValue(fake.db)
    .compile();
  app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(() => app.close());

type Call = { method: 'PUT' | 'DELETE'; url: string; token?: string; body?: object };
const call = ({ method, url, token = 'admin', body }: Call) =>
  app.inject({ method, url, headers: { authorization: `Bearer ${token}` }, payload: body });

describe('/me/push-tokens HTTP (R-MOB-01)', () => {
  it('is admin-only: a teacher gets 403, no token 401', async () => {
    const body = { token: TOKEN };
    expect((await call({ method: 'PUT', url: '/me/push-tokens', token: 'teacher', body })).statusCode).toBe(403);
    expect((await call({ method: 'PUT', url: '/me/push-tokens', token: 'nope', body })).statusCode).toBe(401);
  });

  it('PUT validates the Expo token format: 400 validation_failed', async () => {
    const res = await call({ method: 'PUT', url: '/me/push-tokens', body: { token: 'fcm-raw-token' } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'validation_failed' });
  });

  it('PUT stores the token on the caller’s profile: 204', async () => {
    results['profiles'] = [{ data: { push_tokens: [] } }, {}];
    const res = await call({ method: 'PUT', url: '/me/push-tokens', body: { token: TOKEN } });
    expect(res.statusCode).toBe(204);
    expect(fake.calls).toContainEqual({ table: 'profiles', method: 'update', args: [{ push_tokens: [TOKEN] }] });
  });

  it('DELETE takes the URL-encoded bracketed token: 204', async () => {
    results['profiles'] = [{ data: { push_tokens: [TOKEN] } }, {}];
    fake.calls.length = 0;
    const res = await call({ method: 'DELETE', url: `/me/push-tokens/${encodeURIComponent(TOKEN)}` });
    expect(res.statusCode).toBe(204);
    expect(fake.calls).toContainEqual({ table: 'profiles', method: 'update', args: [{ push_tokens: [] }] });
  });

  it('DELETE with a malformed token is 400', async () => {
    expect((await call({ method: 'DELETE', url: '/me/push-tokens/not-a-token' })).statusCode).toBe(400);
  });
});
