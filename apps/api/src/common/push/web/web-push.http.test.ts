import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '@/app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import type { AuthUser } from '@/common/auth/verify-token';
import { NotificationsRepo } from '@/common/push/notifications.repo';

const USERS: Record<string, AuthUser> = {
  assistant: { id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', email: null, role: 'assistant', sessionId: 'sess-1' },
  noSession: { id: '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', email: null, role: 'assistant' },
  student: { id: '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', email: null, role: 'student' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const q = { list: vi.fn(), readMine: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() };
const SUB = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', expirationTime: null, keys: { p256dh: `B${'A'.repeat(86)}`, auth: 'A'.repeat(22) } };

describe('/me/web-push (R-NOT-02)', () => {
  let app: NestFastifyApplication;
  const call = (o: { method: 'GET' | 'PUT' | 'DELETE'; url: string; token?: string; payload?: object }) =>
    app.inject({ method: o.method, url: o.url, payload: o.payload, headers: { authorization: `Bearer ${o.token ?? 'assistant'}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(NotificationsRepo).useValue(q)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('the key is null while any WEB_PUSH_* is unset, the public key once all three are', async () => {
    expect((await call({ method: 'GET', url: '/me/web-push/key' })).json()).toEqual({ publicKey: null });
    vi.stubEnv('WEB_PUSH_VAPID_PUBLIC_KEY', SUB.keys.p256dh);
    vi.stubEnv('WEB_PUSH_VAPID_PRIVATE_KEY', 'A'.repeat(43));
    expect((await call({ method: 'GET', url: '/me/web-push/key' })).json()).toEqual({ publicKey: null });
    vi.stubEnv('WEB_PUSH_SUBJECT', 'mailto:ops@example.com');
    expect((await call({ method: 'GET', url: '/me/web-push/key' })).json()).toEqual({ publicKey: SUB.keys.p256dh });
  });

  it('PUT stores the subscription for the caller; a disallowed endpoint is 400 and never stored', async () => {
    expect((await call({ method: 'PUT', url: '/me/web-push', payload: SUB })).statusCode).toBe(204);
    expect(q.subscribe).toHaveBeenCalledWith(USERS['assistant']?.id, SUB, 'sess-1');
    for (const endpoint of ['http://fcm.googleapis.com/x', 'https://localhost/x', 'https://127.0.0.1/x', 'https://evil.example/x']) {
      expect((await call({ method: 'PUT', url: '/me/web-push', payload: { ...SUB, endpoint } })).statusCode).toBe(400);
    }
    expect(q.subscribe).toHaveBeenCalledTimes(1);
  });

  it('PUT from a token without a session_id claim is 401 and stores nothing', async () => {
    q.subscribe.mockClear();
    expect((await call({ method: 'PUT', url: '/me/web-push', token: 'noSession', payload: SUB })).statusCode).toBe(401);
    expect(q.subscribe).not.toHaveBeenCalled();
  });

  it('DELETE removes the caller’s row by endpoint', async () => {
    const res = await call({ method: 'DELETE', url: `/me/web-push?endpoint=${encodeURIComponent(SUB.endpoint)}` });
    expect(res.statusCode).toBe(204);
    expect(q.unsubscribe).toHaveBeenCalledWith(USERS['assistant']?.id, SUB.endpoint);
    expect((await call({ method: 'DELETE', url: '/me/web-push' })).statusCode).toBe(400);
  });

  it('403 without notifications.push', async () => {
    expect((await call({ method: 'GET', url: '/me/web-push/key', token: 'student' })).statusCode).toBe(403);
    expect((await call({ method: 'PUT', url: '/me/web-push', token: 'student', payload: SUB })).statusCode).toBe(403);
  });
});
