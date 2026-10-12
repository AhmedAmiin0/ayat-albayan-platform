import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../auth/auth.guard';
import type { AuthUser } from '../auth/verify-token';
import { NotificationsQueries } from './notifications.queries';

const USERS: Record<string, AuthUser> = {
  teacher: { id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', email: null, role: 'teacher' },
  sales: { id: '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', email: null, role: 'sales' },
  guardian: { id: '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', email: null, role: 'guardian' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const q = { list: vi.fn(), readMine: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() };
const ID = '7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d';

describe('/me/notifications (R-NOT-01)', () => {
  let app: NestFastifyApplication;
  const call = (o: { method: 'GET' | 'POST'; url: string; token?: string; payload?: object }) =>
    app.inject({ method: o.method, url: o.url, payload: o.payload, headers: { authorization: `Bearer ${o.token ?? 'teacher'}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(NotificationsQueries).useValue(q)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    q.list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, unread: 0 });
  });

  it('lists the caller’s own rows, whatever the query names', async () => {
    const res = await call({ method: 'GET', url: `/me/notifications?page=2&pageSize=10&profileId=${ID}` });
    expect(res.statusCode).toBe(200);
    expect(q.list).toHaveBeenCalledWith(USERS['teacher']?.id, { page: 2, pageSize: 10 });
    await call({ method: 'GET', url: '/me/notifications', token: 'sales' });
    expect(q.list).toHaveBeenLastCalledWith(USERS['sales']?.id, { page: 1, pageSize: 20 });
  });

  it('400 on a bad page size', async () => {
    expect((await call({ method: 'GET', url: '/me/notifications?pageSize=500' })).statusCode).toBe(400);
    expect(q.list).not.toHaveBeenCalled();
  });

  it('marks the given ids or all, always for the caller only', async () => {
    expect((await call({ method: 'POST', url: '/me/notifications/read', payload: { ids: [ID] } })).statusCode).toBe(204);
    expect(q.readMine).toHaveBeenCalledWith(USERS['teacher']?.id, [ID]);
    expect((await call({ method: 'POST', url: '/me/notifications/read' })).statusCode).toBe(204);
    expect(q.readMine).toHaveBeenLastCalledWith(USERS['teacher']?.id, undefined);
  });

  it('400 on bad ids or extra fields', async () => {
    for (const payload of [{ ids: [] }, { ids: ['x'] }, { ids: [ID], profileId: ID }]) {
      expect((await call({ method: 'POST', url: '/me/notifications/read', payload })).statusCode).toBe(400);
    }
    expect(q.readMine).not.toHaveBeenCalled();
  });

  it('403 without notifications.push (a guardian)', async () => {
    expect((await call({ method: 'GET', url: '/me/notifications', token: 'guardian' })).statusCode).toBe(403);
    expect((await call({ method: 'POST', url: '/me/notifications/read', token: 'guardian' })).statusCode).toBe(403);
    expect(q.list).not.toHaveBeenCalled();
  });
});
