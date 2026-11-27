import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { teacherFixture, teacherRowFixture } from '@ab/shared/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER } from '@/common/auth/auth.guard';
import type { TokenVerifier } from '@/common/auth/auth.guard';
import { ResponseCheckInterceptor } from '@/common/http/returns';
import { featureRoot } from '@/common/infra/test-root';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { SettingsService } from '@/common/settings/settings.service';
import { AvailabilityRepo } from './availability/availability.repo';
import { TeachersModule } from './teachers.module';
import { TeachersRepo } from './teachers.repo';

// The teacher routes as declared (R-TCH-01): the shared id check and the answers' shape.

const verify: TokenVerifier = async (token) => {
  if (token !== 'admin') throw new Error('bad token');
  return { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };
};
const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const stored = { ...teacherFixture({ id: ID }), avatar_path: null };
const teachers = {
  list: vi.fn(),
  get: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  photo: async () => null,
};

describe('teacher routes (R-TCH-01)', () => {
  let app: NestFastifyApplication;
  const call = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, payload, headers: { authorization: 'Bearer admin' } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [featureRoot(TeachersModule)] })
      .overrideProvider(PERMISSION_RESOLVER)
      .useValue(systemResolver)
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .overrideProvider(TeachersRepo)
      .useValue(teachers)
      .overrideProvider(AvailabilityRepo)
      .useValue({})
      .overrideProvider(SettingsService)
      .useValue(fakeSettings())
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalInterceptors(ResponseCheckInterceptor.fromEnv());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => vi.resetAllMocks());

  it.each([
    ['GET', undefined],
    ['PATCH', { rate_60: 1 }],
    ['DELETE', undefined],
  ] as const)('%s with a bad id → 400 validation_failed', async (method, body) => {
    const res = await call(method, '/teachers/abc', body);
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(teachers.get).not.toHaveBeenCalled();
  });

  it('GET /teachers/:id answers the teacher as declared, without the photo path', async () => {
    teachers.get.mockResolvedValue(stored);
    const res = await call('GET', `/teachers/${ID}`);
    expect([res.statusCode, res.json()]).toEqual([
      200,
      { ...teacherFixture({ id: ID }), username: null },
    ]);
  });

  it('GET /teachers answers rows with their counts as declared', async () => {
    const row = teacherRowFixture({ id: ID, active_count: 12 });
    teachers.list.mockResolvedValue({ items: [row], total: 1, page: 1, pageSize: 25 });
    const res = await call('GET', '/teachers');
    expect(res.statusCode).toBe(200);
    expect(res.json().items[0]).toMatchObject({
      id: ID,
      active_count: 12,
      platform_classroom: false,
    });
  });

  it('PATCH and POST answer the stored teacher as declared', async () => {
    teachers.update.mockResolvedValue(stored);
    teachers.insert.mockResolvedValue(stored);
    expect((await call('PATCH', `/teachers/${ID}`, { rate_60: 120 })).statusCode).toBe(200);
    const body = {
      display_name_ar: 'أ. سارة',
      gender: 'female',
      programs: ['quran'],
      tz: 'Africa/Cairo',
    };
    expect((await call('POST', '/teachers', body)).statusCode).toBe(201);
  });
});
