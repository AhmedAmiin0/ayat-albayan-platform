import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { featureRoot } from '@/common/infra/test-root';
import { SettingsModule } from './settings.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import type { AuthUser } from '@/common/auth/verify-token';
import { SettingsMetaRepo } from './settings-meta.repo';

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
const ENTRY = {
  updatedAt: '2026-11-27T10:00:00+00:00',
  updatedBy: 'a0000000-0000-4000-8000-000000000001',
  updatedByName: 'Mona',
};

describe('GET /config/meta', () => {
  let app: NestFastifyApplication;
  const get = (token?: string) =>
    app.inject({ method: 'GET', url: '/config/meta', headers: token ? { authorization: `Bearer ${token}` } : {} });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [featureRoot(SettingsModule)] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .overrideProvider(SettingsMetaRepo).useValue(queries)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => vi.resetAllMocks());

  it('is admin only and returns who changed what', async () => {
    const meta = { activity_retention_days: ENTRY };
    queries.meta.mockResolvedValue(meta);
    expect((await get('teacher')).statusCode).toBe(403);
    expect((await get('admin')).json()).toEqual({ meta });
  });

  it('answers 500 response_invalid when a row falls outside the shared schema', async () => {
    queries.meta.mockResolvedValue({ a: { ...ENTRY, updatedAt: 'T' } });
    const res = await get('admin');
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ code: 'response_invalid' });
  });

  it('needs a login', async () => {
    expect((await get()).statusCode).toBe(401);
    expect(queries.meta).not.toHaveBeenCalled();
  });
});
