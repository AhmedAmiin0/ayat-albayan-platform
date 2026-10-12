import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { fakeSettings } from '../../common/settings/settings.fakes';
import { SettingsService } from '../../common/settings/settings.service';
import { domainError } from './booking.errors';
import { BookingService } from './booking.service';
import { SalesQueries } from '../sales/sales.queries';
import { SlotsService } from './slots.service';
import { TeacherOptionsService } from './teacher-options.service';

const A = 'a1000000-0000-4000-8000-00000000000a';
const B = 'b1000000-0000-4000-8000-00000000000b';
const TEACHER = 'a0000000-0000-4000-8000-000000000001';
const LEAD = 'b0000000-0000-4000-8000-000000000001';
const S1 = 'c0000000-0000-4000-8000-000000000001';
const S2 = 'c0000000-0000-4000-8000-000000000002';
const USERS: Record<string, AuthUser> = {
  salesA: { id: A, email: null, role: 'sales' },
  salesB: { id: B, email: null, role: 'sales' },
  admin: { id: 'ad000000-0000-4000-8000-0000000000ad', email: null, role: 'admin' },
  teacher: { id: 'e1000000-0000-4000-8000-0000000000e1', email: null, role: 'teacher' },
  ta: { id: 'f1000000-0000-4000-8000-0000000000f1', email: null, role: 'assistant' },
  guardian: { id: 'a2000000-0000-4000-8000-0000000000a2', email: null, role: 'guardian' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const OWN_A = { leadIds: [LEAD], guardianIds: ['g1'], studentIds: [S1], phones: ['+966551110000'] };
const NONE = { leadIds: [], guardianIds: [], studentIds: [], phones: [] };
const RULE = { teacherId: TEACHER, byday: [0], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-10-11', package: 'trial' };
const NEW_FAMILY = { ...RULE, leadId: LEAD, newStudent: { name: 'ياسمين', tz: 'Asia/Riyadh' }, guardian: { name: 'أم ياسمين', phone_e164: '+966551110000', tz: 'Asia/Riyadh' } };

describe('/sales/booking: registration by the assistant, with her as the actor', () => {
  let app: NestFastifyApplication;
  const sales = { ownership: vi.fn() };
  const booking = { book: vi.fn(), check: vi.fn() };
  const slots = { slots: vi.fn() };
  const teachers = { list: vi.fn() };
  const call = (o: { method?: 'GET' | 'POST'; url: string; token: string; body?: object }) =>
    app.inject({ method: o.method ?? 'GET', url: o.url, payload: o.body, headers: { authorization: `Bearer ${o.token}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(SalesQueries).useValue(sales)
      .overrideProvider(SettingsService).useValue(fakeSettings()) // sales_auto_assign ON (the default): ownership is checked
      .overrideProvider(BookingService).useValue(booking)
      .overrideProvider(SlotsService).useValue(slots)
      .overrideProvider(TeacherOptionsService).useValue(teachers)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 60_000);
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    sales.ownership.mockImplementation(async (id: string) => (id === A ? OWN_A : NONE));
    booking.book.mockResolvedValue({ rule_id: 'r1', student_ids: ['n1'], guardian_ids: ['g1'], lessons: [], message_ids: [], invoice_id: null });
    booking.check.mockResolvedValue([]);
  });

  it('only the sales base role: admin, teacher, classroom assistant and guardian are 403 on every route; nothing runs', async () => {
    const routes = [
      { method: 'GET' as const, url: '/sales/booking/teachers?program=quran' },
      { method: 'GET' as const, url: `/sales/booking/slots?teacherId=${TEACHER}&from=2026-10-11T00:00:00Z&to=2026-10-12T00:00:00Z&durationMin=45` },
      { method: 'POST' as const, url: '/sales/booking/check', body: NEW_FAMILY },
      { method: 'POST' as const, url: '/sales/booking', body: NEW_FAMILY },
    ];
    for (const r of routes) for (const token of ['admin', 'teacher', 'ta', 'guardian']) expect([r.url, token, (await call({ ...r, token })).statusCode]).toEqual([r.url, token, 403]);
    expect(sales.ownership).not.toHaveBeenCalled();
    expect(booking.book).not.toHaveBeenCalled();
    expect((await app.inject({ method: 'POST', url: '/sales/booking', payload: NEW_FAMILY })).statusCode).toBe(401);
  });

  it('book: her own lead and family -> 201, the booking service runs with HER id as the actor (so created_by is her)', async () => {
    const res = await call({ method: 'POST', url: '/sales/booking', token: 'salesA', body: NEW_FAMILY });
    expect(res.statusCode).toBe(201);
    expect(booking.book).toHaveBeenCalledWith(expect.objectContaining({ leadId: LEAD, teacherId: TEACHER }), A);
  });

  it('book: assistant B cannot use A lead, A students or A family phone; nothing is booked', async () => {
    for (const body of [NEW_FAMILY, { ...RULE, studentIds: [S1] }]) {
      const res = await call({ method: 'POST', url: '/sales/booking', token: 'salesB', body });
      expect(res.statusCode).toBe(403);
    }
    expect(booking.book).not.toHaveBeenCalled();
  });

  it('book: her own student passes, a foreign one, an override and a makeup are 403 with the code', async () => {
    expect((await call({ method: 'POST', url: '/sales/booking', token: 'salesA', body: { ...RULE, studentIds: [S1] } })).statusCode).toBe(201);
    const refused = async (body: object) => (await call({ method: 'POST', url: '/sales/booking', token: 'salesA', body })).json().code;
    expect(await refused({ ...RULE, studentIds: [S2] })).toBe('not_your_student');
    expect(await refused({ ...NEW_FAMILY, override: { reason: 'سبب' } })).toBe('override_not_allowed');
    expect(await refused({ ...NEW_FAMILY, guardian: { ...NEW_FAMILY.guardian, phone_e164: '+966559999999' } })).toBe('not_your_family');
    expect(booking.book).toHaveBeenCalledTimes(1);
  });

  it('book: the input is validated like the admin booking (400), and a clash stays a 409 the assistant cannot override', async () => {
    expect((await call({ method: 'POST', url: '/sales/booking', token: 'salesA', body: { ...NEW_FAMILY, startTimeLocal: '5pm' } })).statusCode).toBe(400);
    expect((await call({ method: 'POST', url: '/sales/booking', token: 'salesA', body: { ...NEW_FAMILY, guardian: { ...NEW_FAMILY.guardian, phone_e164: 'abc' } } })).statusCode).toBe(400);
    booking.book.mockRejectedValue(domainError(409, 'conflict', { conflicts: [] }));
    expect((await call({ method: 'POST', url: '/sales/booking', token: 'salesA', body: NEW_FAMILY })).json().code).toBe('conflict');
  });

  it('book: the duplicate_student 409 shows only her own children', async () => {
    booking.book.mockRejectedValue(domainError(409, 'duplicate_student', { guardian_id: 'g1', candidates: [{ id: S1, name: 'ياسمين', notes: 'x' }, { id: S2, name: 'ياسمينة', notes: 'x' }] }));
    const res = await call({ method: 'POST', url: '/sales/booking', token: 'salesA', body: NEW_FAMILY });
    expect([res.statusCode, res.json()]).toEqual([409, { code: 'duplicate_student', message: 'duplicate_student', candidates: [{ id: S1, name: 'ياسمين' }] }]);
  });

  it('book: only a trial, no custom meeting link, no invoice: 403 with the code, nothing booked; no invoice upload route', async () => {
    const refused = async (over: object) => (await call({ method: 'POST', url: '/sales/booking', token: 'salesA', body: { ...NEW_FAMILY, ...over } })).json().code;
    expect(await refused({ package: '8' })).toBe('kind_not_allowed');
    expect(await refused({ meetingLink: 'https://meet.example/x' })).toBe('meeting_link_not_allowed');
    expect(await refused({ invoice: { source: 'upload', path: 'invoices/x.pdf' } })).toBe('invoice_not_allowed');
    expect(booking.book).not.toHaveBeenCalled();
    expect((await call({ method: 'POST', url: '/sales/booking/invoice-upload-url', token: 'salesA', body: {} })).statusCode).toBe(404);
  });

  it('check: the same scope, then the plain conflicts list', async () => {
    expect((await call({ method: 'POST', url: '/sales/booking/check', token: 'salesB', body: NEW_FAMILY })).statusCode).toBe(403);
    const ok = await call({ method: 'POST', url: '/sales/booking/check', token: 'salesA', body: NEW_FAMILY });
    expect([ok.statusCode, ok.json()]).toEqual([200, { conflicts: [] }]);
  });

  it('teachers: the same list without the meeting links; a student that is not hers is 403', async () => {
    teachers.list.mockResolvedValue([{ id: TEACHER, display_name_ar: 'أبرار', meeting_link: 'https://meet.example/x', students_count: 3 }]);
    const res = await call({ url: '/sales/booking/teachers?program=quran', token: 'salesA' });
    expect(res.json()).toEqual([{ id: TEACHER, display_name_ar: 'أبرار', meeting_link: null, students_count: 3 }]);
    expect((await call({ url: `/sales/booking/teachers?studentId=${S2}`, token: 'salesA' })).statusCode).toBe(403);
    expect((await call({ url: `/sales/booking/teachers?studentId=${S1}`, token: 'salesB' })).statusCode).toBe(403);
    expect((await call({ url: `/sales/booking/teachers?studentId=${S1}`, token: 'salesA' })).statusCode).toBe(200);
  });

  it('slots: foreign students are 403; excludeLessonId (the admin move feature) is dropped', async () => {
    const q = `teacherId=${TEACHER}&from=2026-10-11T00:00:00Z&to=2026-10-12T00:00:00Z&durationMin=45`;
    slots.slots.mockResolvedValue({ teacher_tz: 'Asia/Riyadh', step_min: 45, slots: [] });
    expect((await call({ url: `/sales/booking/slots?${q}&studentIds=${S2}`, token: 'salesA' })).statusCode).toBe(403);
    expect((await call({ url: `/sales/booking/slots?${q}&studentIds=${S1}&excludeLessonId=${S2}`, token: 'salesA' })).statusCode).toBe(200);
    expect(slots.slots.mock.calls[0]?.[0].excludeLessonId).toBeUndefined();
  });
});
