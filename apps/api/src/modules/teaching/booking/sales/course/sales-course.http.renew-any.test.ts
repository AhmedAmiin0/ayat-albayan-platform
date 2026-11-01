import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '@/app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import type { PermissionResolver } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { SettingsService } from '@/common/settings/settings.service';
import { SalesQueries } from '@/modules/sales/sales/sales.queries';
import { BookingService } from '@/modules/teaching/booking/core/booking.service';
import { SlotsService } from '@/modules/teaching/booking/plan/slots.service';
import { SalesCourseQueries } from './sales-course.queries';

// «أيام الحلقات» with sales.renew_any (owner 2026-11-01, docs/16 row 38): the course of ANY
// student, another assistant's (S1, salesA's) or nobody's (S2). sales_auto_assign ON: the slot
// grid is checked too.
const A = 'a1000000-0000-4000-8000-00000000000a';
const B = 'b1000000-0000-4000-8000-00000000000b';
const D = 'd1000000-0000-4000-8000-00000000000d';
const S1 = 'c0000000-0000-4000-8000-000000000001';
const S2 = 'c0000000-0000-4000-8000-000000000002';
const SUB_ID = 'e0000000-0000-4000-8000-000000000001';
const TEACHER = 'a0000000-0000-4000-8000-000000000001';
const USERS: Record<string, AuthUser> = {
  salesA: { id: A, email: null, role: 'sales' },
  holder: { id: B, email: null, role: 'sales' },
  plain: { id: D, email: null, role: 'sales' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
/** Only B holds sales.renew_any; A and D have the system sales role. */
const resolver: PermissionResolver = async (user) => [
  ...(await systemResolver(user)),
  ...(user.id === B ? ['sales.renew_any' as const] : []),
];
const OWN_A = { leadIds: [], guardianIds: [], studentIds: [S1], phones: [] };
const NONE = { leadIds: [], guardianIds: [], studentIds: [], phones: [] };
const SUB = { id: SUB_ID, package: '8', duration: 45, lessons_total: 8, starts_on: '2026-10-10' };
const STUDENT = { id: S2, code: 'AB-0002', name: 'مريم', tz: 'Asia/Riyadh', program: 'quran', teacher_gender_pref: null, teacher_id: null };
const OPTS = { invoiceWaived: true, endsOn: '2026-11-10', course: { package: '8', subscriptionId: SUB_ID, follows: null } };
const course = (id: string) => ({
  teacherId: TEACHER, byday: [0, 2], startTimeLocal: '17:00', tz: 'Asia/Riyadh', durationMin: 45,
  startsOn: '2026-10-18', package: '8', studentIds: [id], dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
});
const GRID = `/sales/booking/slots?teacherId=${TEACHER}&from=2026-10-18T00:00:00Z&to=2026-10-25T00:00:00Z&durationMin=45`;

describe('/sales/booking course routes with sales.renew_any', () => {
  let app: NestFastifyApplication;
  const sales = { ownership: vi.fn() };
  const booking = { book: vi.fn(), check: vi.fn() };
  const slots = { slots: vi.fn() };
  const queries = {
    student: vi.fn(), subscription: vi.fn(), rules: vi.fn(),
    courseRules: vi.fn(), subscriptionBooked: vi.fn(), requested: vi.fn(),
  };
  const call = (o: { method?: 'GET' | 'POST'; url: string; token: string; body?: object }) =>
    app.inject({ method: o.method ?? 'GET', url: o.url, payload: o.body, headers: { authorization: `Bearer ${o.token}` } });
  const post = (token: string, body: object, url = '/sales/booking') => call({ method: 'POST', url, token, body });
  const view = (token: string, id: string) => call({ url: `/sales/booking/course?studentId=${id}`, token });
  const grid = (token: string, extra = '') => call({ url: `${GRID}&studentIds=${S1}${extra}`, token });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(resolver)
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(SalesQueries).useValue(sales)
      .overrideProvider(SettingsService).useValue(fakeSettings({ sales_auto_assign: true }))
      .overrideProvider(BookingService).useValue(booking)
      .overrideProvider(SlotsService).useValue(slots)
      .overrideProvider(SalesCourseQueries).useValue(queries)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 60_000);
  afterAll(() => app.close());
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] });
    vi.resetAllMocks();
    sales.ownership.mockImplementation(async (id: string) => (id === A ? OWN_A : NONE));
    booking.book.mockResolvedValue({ rule_id: 'r1', student_ids: [S2], guardian_ids: ['g1'], lessons: [], message_ids: [], invoice_id: null });
    booking.check.mockResolvedValue([]);
    slots.slots.mockResolvedValue({ slots: [] });
    queries.student.mockResolvedValue(STUDENT);
    queries.subscription.mockResolvedValue(SUB);
    queries.rules.mockResolvedValue([]);
    queries.courseRules.mockResolvedValue([]);
    queries.subscriptionBooked.mockResolvedValue(false);
    queries.requested.mockResolvedValue(false);
  });

  it.each([
    ['another assistant’s student', S1],
    ['a student nobody brought', S2],
  ])('with the key, %s: the view, the check and the booking, she is the actor', async (_, id) => {
    expect((await view('holder', id)).statusCode).toBe(200);
    const check = await post('holder', course(id), '/sales/booking/check');
    expect([check.statusCode, check.json()]).toEqual([200, { conflicts: [] }]);
    expect(booking.check).toHaveBeenCalledWith(expect.objectContaining({ studentIds: [id] }), OPTS);
    expect((await post('holder', course(id))).statusCode).toBe(201);
    const booked = expect.objectContaining({ studentIds: [id] });
    expect(booking.book).toHaveBeenCalledWith(booked, B, OPTS);
  });

  it('with the key, the slot grid of a student not hers: the wizard’s and the change’s (excludeCourse)', async () => {
    expect((await grid('holder')).statusCode).toBe(200);
    expect((await grid('holder', `&excludeCourse=${SUB_ID}`)).statusCode).toBe(200);
    expect(slots.slots).toHaveBeenCalledTimes(2);
    expect(sales.ownership).not.toHaveBeenCalled();
  });

  it('without the key every one of them stays 403 not_your_student and nothing is booked or read', async () => {
    for (const id of [S1, S2]) {
      expect((await view('plain', id)).json().code).toBe('not_your_student');
      expect((await post('plain', course(id), '/sales/booking/check')).json().code).toBe('not_your_student');
      expect((await post('plain', course(id))).json().code).toBe('not_your_student');
    }
    expect((await grid('plain')).json().code).toBe('not_your_student');
    expect((await grid('plain', `&excludeCourse=${SUB_ID}`)).json().code).toBe('not_your_student');
    const untouched = [booking.book, booking.check, slots.slots, queries.student];
    expect(untouched.map((f) => f.mock.calls.length)).toEqual([0, 0, 0, 0]);
  });

  it('her own student still books without the key', async () => {
    expect((await post('salesA', course(S1))).statusCode).toBe(201);
    expect(booking.book).toHaveBeenCalledWith(expect.anything(), A, OPTS);
  });

  it('the key keeps the course rules: no override, one student, the guard’s codes', async () => {
    expect((await post('holder', { ...course(S2), override: { reason: 'سبب' } })).json().code).toBe('override_not_allowed');
    expect((await post('holder', { ...course(S2), studentIds: [S1, S2] })).json().code).toBe('course_one_student');
    queries.subscriptionBooked.mockResolvedValue(true);
    expect((await post('holder', course(S2))).json().code).toBe('course_exists');
    expect(booking.book).not.toHaveBeenCalled();
  });
});
