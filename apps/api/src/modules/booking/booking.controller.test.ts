import { HttpStatus } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { domainError } from './booking.errors';
import { IDS } from './booking.fakes';
import { BookingService } from './booking.service';
import { SlotsService } from './slots.service';
import { TeacherOptionsService } from './teacher-options.service';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const booking = { book: vi.fn(), check: vi.fn() };
const slots = { slots: vi.fn() };
const teachers = { list: vi.fn() };
const BODY = {
  teacherId: IDS.teacher,
  byday: [0],
  startTimeLocal: '17:00',
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-10-04',
  package: 'starter',
  studentIds: [IDS.s1],
};

describe('BookingController (docs/10 §5 #12–14)', () => {
  let app: NestFastifyApplication;
  const call = (opts: { method?: 'GET' | 'POST'; url: string; payload?: object; token?: string }) =>
    app.inject({
      method: opts.method ?? 'GET',
      url: opts.url,
      payload: opts.payload,
      headers: { authorization: `Bearer ${opts.token ?? 'admin'}` },
    });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER)
      .useValue(verify)
      .overrideProvider(BookingService)
      .useValue(booking)
      .overrideProvider(SlotsService)
      .useValue(slots)
      .overrideProvider(TeacherOptionsService)
      .useValue(teachers)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => vi.resetAllMocks());

  it('is admin-only', async () => {
    for (const url of ['/booking/teachers?program=quran', '/booking/slots']) {
      expect((await call({ url, token: 'teacher' })).statusCode).toBe(403);
    }
    expect((await call({ method: 'POST', url: '/booking', payload: BODY, token: 'teacher' })).statusCode).toBe(403);
  });

  it('POST maps a catalog package to its size and books as the signed-in admin', async () => {
    booking.book.mockResolvedValue({ rule_id: 'R1' });
    const res = await call({ method: 'POST', url: '/booking', payload: BODY });
    expect(res.statusCode).toBe(201);
    expect(booking.book).toHaveBeenCalledWith(expect.objectContaining({ package: '8', studentIds: [IDS.s1] }), USERS['admin']?.id);
  });

  it('POST 400 validation_failed for free-text times or both shapes at once', async () => {
    const badTime = await call({ method: 'POST', url: '/booking', payload: { ...BODY, startTimeLocal: '5 العصر' } });
    expect(badTime.statusCode).toBe(400);
    expect(badTime.json()).toMatchObject({ message: 'validation_failed' });
    const both = { ...BODY, leadId: IDS.lead, newStudent: { name: 'ريم', tz: 'Asia/Riyadh' }, guardian: { name: 'أم ريم', phone_e164: '0501234567', tz: 'Asia/Riyadh' } };
    expect((await call({ method: 'POST', url: '/booking', payload: both })).statusCode).toBe(400);
    expect(booking.book).not.toHaveBeenCalled();
  });

  it('POST 409 carries { code, message, conflicts }', async () => {
    const conflicts = [{ kind: 'teacher_busy', startsAt: 'a', endsAt: 'b', lessonId: 'L1' }];
    booking.book.mockRejectedValue(domainError(HttpStatus.CONFLICT, 'conflict', { conflicts }));
    const res = await call({ method: 'POST', url: '/booking', payload: BODY });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ code: 'conflict', message: 'conflict', conflicts });
  });

  it('GET /booking/teachers needs a student or a program', async () => {
    expect((await call({ url: '/booking/teachers' })).statusCode).toBe(400);
    teachers.list.mockResolvedValue([]);
    const res = await call({ url: `/booking/teachers?studentId=${IDS.s1}&gender=female` });
    expect(res.statusCode).toBe(200);
    expect(teachers.list).toHaveBeenCalledWith({ studentId: IDS.s1, gender: 'female' });
  });

  it('GET /booking/slots parses numbers and the comma-separated student ids', async () => {
    slots.slots.mockResolvedValue({ teacher_tz: 'Africa/Cairo', step_min: 30, slots: [] });
    const url = `/booking/slots?teacherId=${IDS.teacher}&from=2026-10-04T00:00:00Z&to=2026-10-11T00:00:00Z&durationMin=45&stepMin=30&studentIds=${IDS.s1},${IDS.s2}`;
    expect((await call({ url })).statusCode).toBe(200);
    expect(slots.slots).toHaveBeenCalledWith({
      teacherId: IDS.teacher,
      from: '2026-10-04T00:00:00Z',
      to: '2026-10-11T00:00:00Z',
      durationMin: 45,
      stepMin: 30,
      studentIds: [IDS.s1, IDS.s2],
    });
  });

  it('GET /booking/slots takes excludeLessonId (R-SCH-11) and rejects one that is not a uuid', async () => {
    slots.slots.mockResolvedValue({ teacher_tz: 'Africa/Cairo', step_min: 15, slots: [] });
    const base = `/booking/slots?teacherId=${IDS.teacher}&from=2026-10-04T00:00:00Z&to=2026-10-05T00:00:00Z&durationMin=45&stepMin=15`;
    expect((await call({ url: `${base}&excludeLessonId=${IDS.s1}` })).statusCode).toBe(200);
    expect(slots.slots).toHaveBeenCalledWith(expect.objectContaining({ stepMin: 15, excludeLessonId: IDS.s1 }));
    expect((await call({ url: `${base}&excludeLessonId=nope` })).statusCode).toBe(400);
  });

  it('GET /booking/slots rejects a duration that is not a lesson length or to ≤ from', async () => {
    const base = `/booking/slots?teacherId=${IDS.teacher}&from=2026-10-04T00:00:00Z`;
    expect((await call({ url: `${base}&to=2026-10-05T00:00:00Z&durationMin=50` })).statusCode).toBe(400);
    expect((await call({ url: `${base}&to=2026-10-03T00:00:00Z&durationMin=45` })).statusCode).toBe(400);
  });

  it('POST /booking/check: the same body, 200 with the series clashes, nothing booked', async () => {
    const clash = { kind: 'outside_availability', startsAt: '2026-11-01T14:00:00.000Z', endsAt: '2026-11-01T14:45:00.000Z' };
    booking.check.mockResolvedValue([clash]);
    const res = await call({ method: 'POST', url: '/booking/check', payload: BODY });
    expect([res.statusCode, res.json()]).toEqual([200, { conflicts: [clash] }]);
    expect(booking.book).not.toHaveBeenCalled();
    expect((await call({ method: 'POST', url: '/booking/check', payload: BODY, token: 'teacher' })).statusCode).toBe(403);
  });
});
