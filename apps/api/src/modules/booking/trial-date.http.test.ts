import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { fakeSettings } from '../../common/settings/settings.fakes';
import { SettingsService } from '../../common/settings/settings.service';
import { SalesQueries } from '../sales/sales.queries';
import { SlotsService } from './slots.service';
import { TrialDateQueries } from './trial-date.queries';
import { TrialDates } from './trial-date.service';

const A = 'a1000000-0000-4000-8000-00000000000a';
const TEACHER = 'a0000000-0000-4000-8000-000000000001';
const S1 = 'c0000000-0000-4000-8000-000000000001';
const S2 = 'c0000000-0000-4000-8000-000000000002';
const L1 = 'd0000000-0000-4000-8000-000000000001';
const USERS: Record<string, AuthUser> = {
  sales: { id: A, email: null, role: 'sales' },
  admin: { id: 'ad000000-0000-4000-8000-0000000000ad', email: null, role: 'admin' },
  teacher: { id: 'e1000000-0000-4000-8000-0000000000e1', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const OWN = { leadIds: [], guardianIds: ['g1'], studentIds: [S1], phones: [] };
const TRIAL = { teacherId: TEACHER, byday: [0], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 30, startsOn: '2099-10-11', package: 'trial', studentIds: [S1] };
const TARGET = { req: TRIAL, old: null };
const RESULT = { lesson_id: L1, starts_at: '2099-10-11T14:00:00.000Z', ends_at: '2099-10-11T14:30:00.000Z', teacher_id: TEACHER, moved_from_id: null };

describe('«موعد تجريبي جديد» routes: the admin’s from the student file, the assistant’s from the chat', () => {
  let app: NestFastifyApplication;
  const sales = { ownership: vi.fn() };
  const dates = { history: vi.fn(), target: vi.fn(), check: vi.fn(), pick: vi.fn(), replay: vi.fn() };
  const slots = { slots: vi.fn() };
  const lessons = { lessonStudents: vi.fn() };
  const call = (o: { method?: 'GET' | 'POST'; url: string; token: string; body?: object }) =>
    app.inject({ method: o.method ?? 'GET', url: o.url, payload: o.body, headers: { authorization: `Bearer ${o.token}` } });
  const post = (url: string, token: string, body: object = TRIAL) => call({ method: 'POST', url, token, body });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(SalesQueries).useValue(sales)
      .overrideProvider(SettingsService).useValue(fakeSettings()) // sales_auto_assign ON: her own families only
      .overrideProvider(TrialDates).useValue(dates)
      .overrideProvider(SlotsService).useValue(slots)
      .overrideProvider(TrialDateQueries).useValue(lessons)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 60_000);
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    sales.ownership.mockResolvedValue(OWN);
    dates.history.mockResolvedValue({ student_id: S1, count: 0, items: [] });
    dates.target.mockImplementation(async (req: { studentIds: string[] }) => ({ req, old: null }));
    dates.check.mockResolvedValue([]);
    dates.pick.mockResolvedValue(RESULT);
    dates.replay.mockResolvedValue(null);
  });

  it('each side only for its role: the assistant’s routes 403 for the admin and a teacher, the admin’s for the assistant', async () => {
    for (const token of ['admin', 'teacher']) {
      expect((await post('/sales/booking/trial-date', token)).statusCode).toBe(403);
      expect((await call({ url: `/sales/booking/trial-dates?studentId=${S1}`, token })).statusCode).toBe(403);
    }
    for (const token of ['sales', 'teacher']) {
      expect((await post('/booking/trial-date', token)).statusCode).toBe(403);
      expect((await post('/booking/trial-date/check', token)).statusCode).toBe(403);
    }
    expect(dates.pick).not.toHaveBeenCalled();
  });

  it('admin: 201 with the pick (the admin is the actor); a replay returns the first pick; the history', async () => {
    const res = await post('/booking/trial-date', 'admin', { ...TRIAL, override: { reason: 'طلب ولي الأمر' } });
    expect([res.statusCode, res.json()]).toEqual([201, RESULT]);
    expect(dates.pick).toHaveBeenCalledWith(expect.objectContaining({ req: expect.objectContaining({ studentIds: [S1] }) }), USERS.admin?.id);
    dates.replay.mockResolvedValue(RESULT);
    expect((await post('/booking/trial-date', 'admin')).json()).toEqual(RESULT);
    expect(dates.pick).toHaveBeenCalledTimes(1);
    expect((await call({ url: `/booking/trial-dates?studentId=${S1}`, token: 'admin' })).statusCode).toBe(200);
    expect((await call({ url: '/booking/trial-dates?studentId=nope', token: 'admin' })).statusCode).toBe(400);
  });

  it('assistant: her own family’s student → 201 as her; anything else is refused like her trial booking', async () => {
    expect((await post('/sales/booking/trial-date', 'sales')).statusCode).toBe(201);
    expect(dates.pick).toHaveBeenCalledWith(TARGET, A);
    const refused = async (over: object) => (await post('/sales/booking/trial-date', 'sales', { ...TRIAL, ...over })).json().code;
    expect(await refused({ studentIds: [S2] })).toBe('not_your_student');
    expect(await refused({ override: { reason: 'سبب' } })).toBe('override_not_allowed');
    expect(await refused({ meetingLink: 'https://meet.example/x' })).toBe('meeting_link_not_allowed');
    expect(await refused({ startsAt: '2020-01-05T14:00:00Z' })).toBe('date_in_past');
    expect(dates.pick).toHaveBeenCalledTimes(1);
  });

  it('assistant: a move books the trial’s own students: a sibling who is not hers is 403', async () => {
    dates.target.mockResolvedValue({ req: { ...TRIAL, studentIds: [S1, S2] }, old: { id: L1 } });
    expect((await post('/sales/booking/trial-date', 'sales')).json().code).toBe('not_your_student');
    expect((await post('/sales/booking/trial-date/check', 'sales')).json().code).toBe('not_your_student');
    expect(dates.pick).not.toHaveBeenCalled();
  });

  it('assistant: the history of her own student only; check answers the conflicts', async () => {
    expect((await call({ url: `/sales/booking/trial-dates?studentId=${S2}`, token: 'sales' })).statusCode).toBe(403);
    expect((await call({ url: `/sales/booking/trial-dates?studentId=${S1}`, token: 'sales' })).statusCode).toBe(200);
    const ok = await post('/sales/booking/trial-date/check', 'sales');
    expect([ok.statusCode, ok.json()]).toEqual([200, { conflicts: [] }]);
  });

  it('assistant slots: excludeLessonId only for a lesson of the grid’s own students (her moved trial)', async () => {
    const q = `teacherId=${TEACHER}&from=2026-10-11T00:00:00Z&to=2026-10-12T00:00:00Z&durationMin=45`;
    slots.slots.mockResolvedValue({ teacher_tz: 'Asia/Riyadh', step_min: 45, slots: [] });
    const kept = async (students: string[], ids = `&studentIds=${S1}`) => {
      lessons.lessonStudents.mockResolvedValue(students);
      expect((await call({ url: `/sales/booking/slots?${q}${ids}&excludeLessonId=${L1}`, token: 'sales' })).statusCode).toBe(200);
      return slots.slots.mock.calls.at(-1)?.[0].excludeLessonId;
    };
    expect([await kept([S1, S2]), await kept([S1]), await kept([S1], '')]).toEqual([undefined, L1, undefined]);
  });

  it('assistant slots: another family’s students are 403, with or without excludeLessonId', async () => {
    const q = `teacherId=${TEACHER}&from=2026-10-11T00:00:00Z&to=2026-10-12T00:00:00Z&durationMin=45&studentIds=${S2}`;
    expect((await call({ url: `/sales/booking/slots?${q}`, token: 'sales' })).statusCode).toBe(403);
    expect((await call({ url: `/sales/booking/slots?${q}&excludeLessonId=${L1}`, token: 'sales' })).statusCode).toBe(403);
    expect(lessons.lessonStudents).not.toHaveBeenCalled();
    expect(slots.slots).not.toHaveBeenCalled();
  });
});
