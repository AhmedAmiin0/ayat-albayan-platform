import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { DB } from '../../common/db/db.module';
import { fakeDb, type FakeResult } from '../guardians/fake-db';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'admin-1', email: 'a@x.com', role: 'admin', sessionId: 'sess-1' },
  teacher: { id: 'teacher-1', email: 't@x.com', role: 'teacher' },
  guardian: { id: 'guardian-1', email: 'g@x.com', role: 'guardian' },
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
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER)
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
  it('is staff-only (notifications.push, every staff role since the bell): a guardian gets 403, no token 401', async () => {
    const body = { token: TOKEN };
    expect((await call({ method: 'PUT', url: '/me/push-tokens', token: 'guardian', body })).statusCode).toBe(403);
    expect((await call({ method: 'PUT', url: '/me/push-tokens', token: 'nope', body })).statusCode).toBe(401);
  });

  it('PUT validates the Expo token format: 400 validation_failed', async () => {
    const res = await call({ method: 'PUT', url: '/me/push-tokens', body: { token: 'fcm-raw-token' } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ message: 'validation_failed' });
  });

  it('PUT stores the token on the caller’s profile: 200 with the device key to keep', async () => {
    results['profiles'] = [{ data: { push_tokens: [] } }, {}];
    const res = await call({ method: 'PUT', url: '/me/push-tokens', body: { token: TOKEN } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ deviceKey: expect.stringMatching(/^[\w-]{43}$/) });
    expect(fake.calls).toContainEqual({ table: 'profiles', method: 'update', args: [{ push_tokens: [TOKEN] }] });
    expect(fake.calls).toContainEqual({
      table: 'push_device_sessions',
      method: 'upsert',
      args: [
        { token: TOKEN, profile_id: 'admin-1', session_id: 'sess-1', device_key_hash: expect.stringMatching(/^[0-9a-f]{64}$/), contested_at: null },
        { onConflict: 'token' },
      ],
    });
  });

  it('PUT of another person’s live device is 409 push_device_in_use; a malformed device key 400', async () => {
    results['push_device_sessions'] = [{ data: { profile_id: 'teacher-9', session_id: 'sess-9', device_key_hash: null } }];
    results['rpc:push_live_sessions'] = [{ data: ['sess-9'] }];
    const res = await call({ method: 'PUT', url: '/me/push-tokens', body: { token: TOKEN } });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ message: 'push_device_in_use' });
    const bad = await call({ method: 'PUT', url: '/me/push-tokens', body: { token: TOKEN, deviceKey: 'short' } });
    expect(bad.statusCode).toBe(400);
  });

  it('PUT from a token without a session_id claim is 401 (never bound to nobody)', async () => {
    const res = await call({ method: 'PUT', url: '/me/push-tokens', token: 'teacher', body: { token: TOKEN } });
    expect(res.statusCode).toBe(401);
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
