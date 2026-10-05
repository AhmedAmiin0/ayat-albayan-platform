import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { HorizonJob } from './horizon.job';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const horizon = { runOnce: vi.fn(), onApplicationBootstrap: vi.fn(), onModuleDestroy: vi.fn() };

describe('POST /schedule-rules/refresh («مزامنة الجدول», R-SCH-02)', () => {
  let app: NestFastifyApplication;
  const post = (token: string) =>
    app.inject({ method: 'POST', url: '/schedule-rules/refresh', headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .overrideProvider(HorizonJob)
      .useValue(horizon)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => vi.resetAllMocks());

  it('is admin-only: a teacher gets 403 and nothing runs', async () => {
    expect((await post('teacher')).statusCode).toBe(403);
    expect(horizon.runOnce).not.toHaveBeenCalled();
  });

  it('runs the horizon pass now and answers its summary', async () => {
    horizon.runOnce.mockResolvedValue({ rules: 4, inserted: 7, failed: 0, ended: 1 });
    const res = await post('admin');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ rules: 4, inserted: 7, failed: 0, ended: 1 });
    expect(horizon.runOnce).toHaveBeenCalledTimes(1);
  });
});
