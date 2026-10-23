import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../auth/auth.guard';
import type { AuthUser } from '../auth/verify-token';
import { SettingsMetaQueries } from './settings-meta.queries';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const queries = { meta: vi.fn() };

describe('GET /config/meta', () => {
  let app: NestFastifyApplication;
  const get = (token?: string) =>
    app.inject({ method: 'GET', url: '/config/meta', headers: token ? { authorization: `Bearer ${token}` } : {} });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .overrideProvider(SettingsMetaQueries).useValue(queries)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => vi.resetAllMocks());

  it('is admin only and returns who changed what', async () => {
    const meta = { activity_retention_days: { updatedAt: 'T', updatedBy: 'u', updatedByName: 'منى' } };
    queries.meta.mockResolvedValue(meta);
    expect((await get('teacher')).statusCode).toBe(403);
    expect((await get('admin')).json()).toEqual({ meta });
  });

  it('needs a login', async () => {
    expect((await get()).statusCode).toBe(401);
    expect(queries.meta).not.toHaveBeenCalled();
  });
});
