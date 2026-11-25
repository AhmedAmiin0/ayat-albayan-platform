import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { featureRoot } from '@/common/infra/test-root';
import { TeachersModule } from '@/modules/people/teachers/teachers.module';
import {
  PERMISSION_RESOLVER,
  systemResolver,
  TOKEN_VERIFIER,
  type TokenVerifier,
} from '@/common/auth/auth.guard';
import type { AuthUser } from '@/common/auth/verify-token';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { AvailabilityRepo } from './availability.repo';

const OWN = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const OTHER = '7a2d3c9f-1e1b-4d9f-8b62-3b7c1a7e0f22';
const OFF = '8b3e4d0a-2f2c-4e0a-9c73-4c8d2b8f1a33';
const TEACHER: AuthUser = { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' };
const verify: TokenVerifier = async () => TEACHER;
const teachers = { idByProfile: vi.fn(async () => OWN) };
const availability = {
  listTimeOff: vi.fn(),
  insertTimeOff: vi.fn(),
  updateTimeOff: vi.fn(),
  deleteTimeOff: vi.fn(),
};
const OFF_BODY = { starts_at: '2026-10-05T10:00:00Z', ends_at: '2026-10-06T10:00:00Z' };
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

const ROUTES: readonly (readonly [Method, string, object?])[] = [
  ['GET', `/teachers/${OTHER}/time-off`],
  ['POST', `/teachers/${OTHER}/time-off`, OFF_BODY],
  ['PUT', `/teachers/${OTHER}/time-off/${OFF}`, OFF_BODY],
  ['DELETE', `/teachers/${OTHER}/time-off/${OFF}`],
];

// A teacher login keeps to its own time off: another teacher's id is refused before any read.
describe('time off: another teacher’s id', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [featureRoot(TeachersModule)] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(TeachersRepo).useValue(teachers)
      .overrideProvider(AvailabilityRepo).useValue(availability)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => vi.clearAllMocks());

  it('is 403 on every time-off route, and nothing is read or written', async () => {
    for (const [method, url, payload] of ROUTES) {
      const headers = { authorization: 'Bearer teacher' };
      const res = await app.inject({ method, url, headers, ...(payload ? { payload } : {}) });
      expect([method, url, res.statusCode]).toEqual([method, url, 403]);
    }
    for (const fn of Object.values(availability)) expect(fn).not.toHaveBeenCalled();
  });
});
