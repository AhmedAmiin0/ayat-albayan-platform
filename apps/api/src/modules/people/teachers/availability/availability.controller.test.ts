import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../../common/auth/auth.guard';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { TeachersModule } from '../teachers.module';
import { TeachersQueries } from '../teachers.queries';
import { AvailabilityQueries } from './availability.queries';

const OWN = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const OTHER = '7a2d3c9f-1e1b-4d9f-8b62-3b7c1a7e0f22';
const OFF = '8b3e4d0a-2f2c-4e0a-9c73-4c8d2b8f1a33';
const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
  guardian: { id: 'g0000000-0000-4000-8000-000000000003', email: null, role: 'guardian' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const teachers = { idByProfile: vi.fn() };
const availability = {
  listSlots: vi.fn(),
  replaceSlots: vi.fn(),
  listTimeOff: vi.fn(),
  insertTimeOff: vi.fn(),
  updateTimeOff: vi.fn(),
  deleteTimeOff: vi.fn(),
};
const SLOT = { weekday: 6, start_time: '16:00', end_time: '18:30', tz: 'Africa/Cairo' };
const OFF_BODY = { starts_at: '2026-10-05T10:00:00Z', ends_at: '2026-10-06T10:00:00Z' };

describe('AvailabilityController (R-TCH-02)', () => {
  let app: NestFastifyApplication;
  type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
  const call = (as: string, req: { method: Method; url: string; payload?: object }) =>
    app.inject({ ...req, headers: { authorization: `Bearer ${as}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule, TeachersModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .overrideProvider(TeachersQueries)
      .useValue(teachers)
      .overrideProvider(AvailabilityQueries)
      .useValue(availability)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    teachers.idByProfile.mockResolvedValue(OWN);
    availability.listSlots.mockResolvedValue([]);
  });

  describe('scoping', () => {
    it('a teacher reads their own grid', async () => {
      const res = await call('teacher', { method: 'GET', url: `/teachers/${OWN}/availability` });
      expect(res.statusCode).toBe(200);
      expect(teachers.idByProfile).toHaveBeenCalledWith(USERS['teacher']?.id);
    });

    it("a teacher cannot read or replace another teacher's grid", async () => {
      const url = `/teachers/${OTHER}/availability`;
      expect((await call('teacher', { method: 'GET', url })).statusCode).toBe(403);
      expect((await call('teacher', { method: 'PUT', url, payload: { slots: [] } })).statusCode).toBe(403);
      expect(availability.listSlots).not.toHaveBeenCalled();
      expect(availability.replaceSlots).not.toHaveBeenCalled();
    });

    it('a teacher login without a teacher row is 403', async () => {
      teachers.idByProfile.mockResolvedValue(null);
      const res = await call('teacher', { method: 'GET', url: `/teachers/${OWN}/time-off` });
      expect(res.statusCode).toBe(403);
    });

    it('a guardian is 403; an admin reaches any teacher', async () => {
      const url = `/teachers/${OTHER}/availability`;
      expect((await call('guardian', { method: 'GET', url })).statusCode).toBe(403);
      expect((await call('admin', { method: 'GET', url })).statusCode).toBe(200);
    });
  });

  describe('weekly grid', () => {
    it('PUT replaces the grid with validated slots', async () => {
      availability.replaceSlots.mockResolvedValue([{ id: 'r1', ...SLOT }]);
      const url = `/teachers/${OWN}/availability`;
      const res = await call('teacher', { method: 'PUT', url, payload: { slots: [SLOT] } });
      expect(res.statusCode).toBe(200);
      expect(availability.replaceSlots).toHaveBeenCalledWith({
        teacherId: OWN,
        actorId: USERS['teacher']?.id,
        slots: [SLOT],
      });
    });

    it('PUT rejects a slot that ends before it starts', async () => {
      const slots = [{ ...SLOT, end_time: '15:00' }];
      const res = await call('admin', { method: 'PUT', url: `/teachers/${OWN}/availability`, payload: { slots } });
      expect(res.statusCode).toBe(400);
      expect(res.json().issues[0]).toEqual({ path: 'slots.0.end_time', message: 'end_before_start' });
    });
  });

  describe('time-off', () => {
    const url = `/teachers/${OWN}/time-off`;

    it('POST creates with the actor as created_by', async () => {
      availability.insertTimeOff.mockResolvedValue({ id: OFF });
      const res = await call('teacher', { method: 'POST', url, payload: OFF_BODY });
      expect(res.statusCode).toBe(201);
      expect(availability.insertTimeOff).toHaveBeenCalledWith({
        teacherId: OWN,
        actorId: USERS['teacher']?.id,
        body: OFF_BODY,
      });
    });

    it('POST rejects a range that ends before it starts', async () => {
      const payload = { starts_at: OFF_BODY.ends_at, ends_at: OFF_BODY.starts_at };
      expect((await call('admin', { method: 'POST', url, payload })).statusCode).toBe(400);
    });

    it('PUT of an unknown time-off is 404', async () => {
      availability.updateTimeOff.mockResolvedValue(null);
      const res = await call('admin', { method: 'PUT', url: `${url}/${OFF}`, payload: OFF_BODY });
      expect(res.statusCode).toBe(404);
    });

    it('DELETE: 204 when removed, 404 when missing', async () => {
      availability.deleteTimeOff.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      expect((await call('admin', { method: 'DELETE', url: `${url}/${OFF}` })).statusCode).toBe(204);
      expect((await call('admin', { method: 'DELETE', url: `${url}/${OFF}` })).statusCode).toBe(404);
      expect(availability.deleteTimeOff).toHaveBeenCalledWith(OWN, OFF);
    });
  });
});
