import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { PermissionResolver } from '../../common/auth/permissions';
import type { AuthUser } from '../../common/auth/verify-token';
import { fakeSettings } from '../../common/settings/settings.fakes';
import { SettingsService } from '../../common/settings/settings.service';
import { SalesQueries } from '../sales/sales.queries';
import { domainError } from './booking.errors';
import { BookingService } from './booking.service';
import { SalesCourseQueries } from './sales-course.queries';

// The assistant's course over HTTP (owner 2026-10-18): sales_auto_assign OFF here, so every 403
// not_your_student below proves a course checks her ownership whatever the switch says.
const A = 'a1000000-0000-4000-8000-00000000000a';
const B = 'b1000000-0000-4000-8000-00000000000b';
const C = 'c1000000-0000-4000-8000-00000000000c';
const S1 = 'c0000000-0000-4000-8000-000000000001';
const USERS: Record<string, AuthUser> = {
  salesA: { id: A, email: null, role: 'sales' },
  salesB: { id: B, email: null, role: 'sales' },
  noMoney: { id: C, email: null, role: 'sales' },
  admin: { id: 'ad000000-0000-4000-8000-0000000000ad', email: null, role: 'admin' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
/** C is a salesperson whose role lacks self.sales_money. */
const resolver: PermissionResolver = async (user) => (user.id === C ? ['self.sales'] : systemResolver(user));
const OWN_A = { leadIds: [], guardianIds: [], studentIds: [S1], phones: [] };
const NONE = { leadIds: [], guardianIds: [], studentIds: [], phones: [] };
const SUB = { id: 'sub1', package: '8', duration: 45, lessons_total: 8, starts_on: '2026-10-10' };
const COURSE = {
  teacherId: 'a0000000-0000-4000-8000-000000000001', byday: [0, 2], startTimeLocal: '17:00', tz: 'Asia/Riyadh',
  durationMin: 45, startsOn: '2026-10-18', package: '8', studentIds: [S1], dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
};
const STUDENT = { id: S1, code: 'AB-0001', name: 'سهيلة', tz: 'Asia/Riyadh', program: 'quran', teacher_gender_pref: null, teacher_id: null };

describe('/sales/booking — the assistant books the course of her subscription', () => {
  let app: NestFastifyApplication;
  const sales = { ownership: vi.fn() };
  const booking = { book: vi.fn(), check: vi.fn() };
  const course = { student: vi.fn(), subscription: vi.fn(), rules: vi.fn(), courseRules: vi.fn(), subscriptionBooked: vi.fn(), requested: vi.fn() };
  const OPTS = { invoiceWaived: true, endsOn: '2026-11-10', course: { package: '8', subscriptionId: 'sub1', follows: null } };
  const call = (o: { method?: 'GET' | 'POST'; url: string; token: string; body?: object }) =>
    app.inject({ method: o.method ?? 'GET', url: o.url, payload: o.body, headers: { authorization: `Bearer ${o.token}` } });
  const post = (token: string, body: object, url = '/sales/booking') => call({ method: 'POST', url, token, body });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(resolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(SalesQueries).useValue(sales)
      .overrideProvider(SettingsService).useValue(fakeSettings({ sales_auto_assign: false }))
      .overrideProvider(BookingService).useValue(booking)
      .overrideProvider(SalesCourseQueries).useValue(course)
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
    booking.book.mockResolvedValue({ rule_id: 'r1', student_ids: [S1], guardian_ids: ['g1'], lessons: [], message_ids: [], invoice_id: null });
    booking.check.mockResolvedValue([]);
    course.student.mockResolvedValue(STUDENT);
    course.subscription.mockResolvedValue(SUB);
    course.rules.mockResolvedValue([]);
    course.courseRules.mockResolvedValue([]);
    course.subscriptionBooked.mockResolvedValue(false);
    course.requested.mockResolvedValue(false);
  });

  it('book: her course → 201 with her id, no invoice and every rule ending on the 8th lesson', async () => {
    expect((await post('salesA', COURSE)).statusCode).toBe(201);
    expect(booking.book).toHaveBeenCalledWith(expect.objectContaining({ studentIds: [S1] }), A, OPTS);
  });

  it('a retry with the same clientRequestId after a success replays the same rule, not course_exists (m6)', async () => {
    const body = { ...COURSE, clientRequestId: 'e0000000-0000-4000-8000-00000000000e' };
    const first = await post('salesA', body);
    course.requested.mockResolvedValue(true);
    course.subscriptionBooked.mockResolvedValue(true);
    const again = await post('salesA', body);
    expect([first.json().rule_id, again.statusCode, again.json().rule_id]).toEqual(['r1', 201, 'r1']);
    expect(booking.book).toHaveBeenLastCalledWith(expect.anything(), A);
    expect((await post('salesB', body)).json().code).toBe('not_your_student');
  });

  it('the subscription already has its course → 409 course_exists (M3); a custom 24 books 6 days, package null (M4)', async () => {
    course.subscriptionBooked.mockResolvedValue(true);
    expect((await post('salesA', COURSE)).json().code).toBe('course_exists');
    course.subscriptionBooked.mockResolvedValue(false);
    course.subscription.mockResolvedValue({ ...SUB, package: null, lessons_total: 24 });
    const six = { ...COURSE, byday: [0, 1, 2, 3, 4, 5], package: '8' };
    expect((await post('salesA', six)).statusCode).toBe(201);
    expect(booking.book).toHaveBeenLastCalledWith(expect.anything(), A, expect.objectContaining({ course: { package: null, subscriptionId: 'sub1', follows: null } }));
  });

  it('check: the same guard, then the conflicts of the capped series', async () => {
    const res = await post('salesA', COURSE, '/sales/booking/check');
    expect([res.statusCode, res.json()]).toEqual([200, { conflicts: [] }]);
    expect(booking.check).toHaveBeenCalledWith(expect.anything(), OPTS);
  });

  it('403: no self.sales_money (kind_not_allowed), another assistant’s student even with auto-assign OFF', async () => {
    expect((await post('noMoney', COURSE)).json().code).toBe('kind_not_allowed');
    expect((await post('salesB', COURSE)).json().code).toBe('not_your_student');
    expect((await post('salesA', { ...COURSE, meetingLink: 'https://meet.example/x' })).json().code).toBe('meeting_link_not_allowed');
    expect((await post('salesA', { ...COURSE, invoice: { source: 'upload', path: 'x/a.pdf' } })).json().code).toBe('invoice_not_allowed');
    expect(booking.book).not.toHaveBeenCalled();
  });

  it('the guard’s codes: days_count_mismatch 400, course_exists 409, subscription_required 409', async () => {
    expect((await post('salesA', { ...COURSE, byday: [0], dayTimes: undefined })).json()).toMatchObject({ code: 'days_count_mismatch' });
    course.rules.mockResolvedValue([{ starts_on: '2026-09-01', ends_on: null, package: '8' }]);
    const exists = await post('salesA', COURSE);
    expect([exists.statusCode, exists.json().code]).toEqual([409, 'course_exists']);
    course.subscription.mockResolvedValue(null);
    expect((await post('salesA', COURSE)).statusCode).toBe(409);
    expect(booking.book).not.toHaveBeenCalled();
  });

  it('a clash is a 409 conflict she cannot override', async () => {
    booking.book.mockRejectedValue(domainError(409, 'conflict', { conflicts: [] }));
    expect((await post('salesA', COURSE)).json().code).toBe('conflict');
    expect((await post('salesA', { ...COURSE, override: { reason: 'سبب' } })).json().code).toBe('override_not_allowed');
  });

  it('GET course: her student → the view with perWeek 2; another’s 403; no self.sales_money or admin 403', async () => {
    const res = await call({ url: `/sales/booking/course?studentId=${S1}`, token: 'salesA' });
    expect([res.statusCode, res.json()]).toEqual([200, { student: STUDENT, subscription: SUB, perWeek: 2, blocked: null, previous: null, current: null }]);
    expect((await call({ url: `/sales/booking/course?studentId=${S1}`, token: 'salesB' })).json().code).toBe('not_your_student');
    expect((await call({ url: `/sales/booking/course?studentId=${S1}`, token: 'noMoney' })).statusCode).toBe(403);
    expect((await call({ url: `/sales/booking/course?studentId=${S1}`, token: 'admin' })).statusCode).toBe(403);
    expect((await call({ url: '/sales/booking/course?studentId=x', token: 'salesA' })).statusCode).toBe(400);
  });
});
