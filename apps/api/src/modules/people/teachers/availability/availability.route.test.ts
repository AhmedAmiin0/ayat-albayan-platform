import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER } from '@/common/auth/auth.guard';
import type { TokenVerifier } from '@/common/auth/auth.guard';
import { ResponseCheckInterceptor } from '@/common/http/returns';
import { featureRoot } from '@/common/infra/test-root';
import { TeachersModule } from '@/modules/people/teachers/teachers.module';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { AvailabilityRepo } from './availability.repo';

// The availability routes as declared: the shared id checks and the answers' shape.

const ADMIN = 'a0000000-0000-4000-8000-000000000001';
const ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const OFF = '8b3e4d0a-2f2c-4e0a-9c73-4c8d2b8f1a33';
const verify: TokenVerifier = async (token) => {
  if (token !== 'admin') throw new Error('bad token');
  return { id: ADMIN, email: null, role: 'admin' };
};
const slot = { id: OFF, weekday: 6, start_time: '16:00', end_time: '18:30', tz: 'Africa/Cairo' };
const body = { starts_at: '2026-10-05T10:00:00Z', ends_at: '2026-10-06T10:00:00Z' };
const timeOff = {
  id: OFF,
  teacher_id: ID,
  ...body,
  reason: null,
  created_at: '2026-10-01T10:00:00Z',
  created_by: ADMIN,
  updated_at: '2026-10-01T10:00:00Z',
};
const availability = {
  listSlots: vi.fn(),
  replaceSlots: vi.fn(),
  listTimeOff: vi.fn(),
  insertTimeOff: vi.fn(),
  updateTimeOff: vi.fn(),
  deleteTimeOff: vi.fn(),
};

describe('availability routes (R-TCH-02)', () => {
  let app: NestFastifyApplication;
  const call = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, payload, headers: { authorization: 'Bearer admin' } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [featureRoot(TeachersModule)] })
      .overrideProvider(PERMISSION_RESOLVER)
      .useValue(systemResolver)
      .overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .overrideProvider(TeachersRepo)
      .useValue({ idByProfile: vi.fn() })
      .overrideProvider(AvailabilityRepo)
      .useValue(availability)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalInterceptors(ResponseCheckInterceptor.fromEnv());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => vi.resetAllMocks());

  it.each([
    ['GET', '/teachers/abc/availability', undefined],
    ['PUT', '/teachers/abc/availability', { slots: [] }],
    ['POST', '/teachers/abc/time-off', body],
    ['PUT', `/teachers/${ID}/time-off/abc`, body],
    ['DELETE', `/teachers/${ID}/time-off/abc`, undefined],
  ] as const)('%s %s → 400 validation_failed', async (method, url, payload) => {
    const res = await call(method, url, payload);
    expect([res.statusCode, res.json().message]).toEqual([400, 'validation_failed']);
    expect(Object.values(availability).some((fn) => fn.mock.calls.length > 0)).toBe(false);
  });

  it('GET the grid and the time-off answer as declared', async () => {
    availability.listSlots.mockResolvedValue([slot]);
    availability.listTimeOff.mockResolvedValue([timeOff]);
    expect((await call('GET', `/teachers/${ID}/availability`)).json()).toEqual([slot]);
    expect((await call('GET', `/teachers/${ID}/time-off`)).json()).toEqual([timeOff]);
  });

  it('PUT the grid and POST and PUT a time-off answer as declared', async () => {
    availability.replaceSlots.mockResolvedValue([slot]);
    availability.insertTimeOff.mockResolvedValue(timeOff);
    availability.updateTimeOff.mockResolvedValue(timeOff);
    const { id: _, ...weekly } = slot;
    const grid = await call('PUT', `/teachers/${ID}/availability`, { slots: [weekly] });
    expect([grid.statusCode, grid.json()]).toEqual([200, [slot]]);
    expect((await call('POST', `/teachers/${ID}/time-off`, body)).statusCode).toBe(201);
    expect((await call('PUT', `/teachers/${ID}/time-off/${OFF}`, body)).json()).toEqual(timeOff);
    expect(availability.updateTimeOff).toHaveBeenCalledWith({
      teacherId: ID,
      id: OFF,
      body,
    });
  });

  it('DELETE answers 204, or 404 when the time-off is not the teacher’s', async () => {
    availability.deleteTimeOff.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await call('DELETE', `/teachers/${ID}/time-off/${OFF}`)).statusCode).toBe(204);
    expect((await call('DELETE', `/teachers/${ID}/time-off/${OFF}`)).statusCode).toBe(404);
    expect(availability.deleteTimeOff).toHaveBeenCalledWith(ID, OFF);
  });
});
