import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';
import type { BookingResult, SalesCourseView, SalesMoneySubscriptionView } from '@ab/shared';
import { call, family, makeAssistant, type Assistant } from '../support/assistant-api';
import { setSetting } from '../support/messages';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, seedLesson, setAvailability, withSql } from '../support/schedule';

// Owner 2026-10-18 «the assistant books the course of a subscription she sold», through the REAL API and
// database: an 8-lesson (2 a week) unpaid subscription of her student, booked as Sun 17:00 + Tue 19:30
// (one rule per time). Exactly 8 lessons, created by her, no invoice; the plan's day count, her own student
// (even with auto-assign OFF), no invoice / link / override, no overlapping course, no clash.

const need = <T>(v: T | undefined): T => {
  if (v === undefined) throw new Error('an earlier step did not run');
  return v;
};

test.describe.serial('sales: the course of her subscription with a time per day (API + DB)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  let teacher = '';
  let a: Assistant | undefined;
  let b: Assistant | undefined;
  let student = '';
  const sunday = addDays(nextWeekSaturday(), 1);
  const tuesdayTwo = addDays(sunday, 9);
  const course = (over: object = {}) => ({
    teacherId: teacher, byday: [0, 2], startTimeLocal: '17:00', dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
    tz: 'Asia/Riyadh', durationMin: 45, startsOn: sunday, startsAt: riyadh(sunday, '17:00').toISOString(),
    package: '8', studentIds: [student], clientRequestId: randomUUID(), ...over,
  });
  const book = (request: APIRequestContext, token: string, body: object) =>
    call<BookingResult & { code?: string }>(request, { token, method: 'POST', path: '/sales/booking', body });

  test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    teacher = await resetAbrar();
    await setAvailability(teacher, [[0, '08:00', '22:00'], [2, '08:00', '22:00']]);
    a = await makeAssistant('coursea');
    b = await makeAssistant('courseb');
    student = (await family(need(a).id, 'جنى')).student;
    const sub = await call<SalesMoneySubscriptionView>(ctx, {
      token: need(a).token, method: 'POST', path: '/sales/subscriptions',
      body: { studentId: student, pricing: { tier: 'starter', duration: 45 }, clientRequestId: randomUUID() },
    });
    expect(sub.status, JSON.stringify(sub.body)).toBe(201);
    expect(sub.body.status).toBe('unpaid');
    await ctx.dispose();
  });
  test.afterAll(() => setSetting('sales_auto_assign', true));

  test('GET /sales/booking/course: her student, the unpaid 8-lesson subscription, 2 days a week, not blocked', async ({ request }) => {
    const res = await call<SalesCourseView>(request, { token: need(a).token, method: 'GET', path: `/sales/booking/course?studentId=${student}` });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toMatchObject({ student: { id: student }, subscription: { lessons_total: 8, duration: 45 }, perWeek: 2, blocked: null });
  });

  test('one day for an 8-lesson plan is 400 days_count_mismatch; an invoice or a meeting link is 403', async ({ request }) => {
    const token = need(a).token;
    const oneDay = await book(request, token, course({ byday: [0], dayTimes: undefined }));
    expect([oneDay.status, oneDay.body.code]).toEqual([400, 'days_count_mismatch']);
    const invoice = await book(request, token, course({ invoice: { source: 'upload', path: 'x/a.pdf' } }));
    const link = await book(request, token, course({ meetingLink: 'https://meet.example/own' }));
    expect([invoice.status, invoice.body.code, link.status, link.body.code]).toEqual([403, 'invoice_not_allowed', 403, 'meeting_link_not_allowed']);
  });

  test('another assistant’s student is 403 not_your_student even with auto-assign OFF', async ({ request }) => {
    await setSetting('sales_auto_assign', false);
    try {
      const res = await book(request, need(b).token, course());
      expect([res.status, res.body.code]).toEqual([403, 'not_your_student']);
    } finally {
      await setSetting('sales_auto_assign', true);
    }
  });

  test('a clash in any week is 409 conflict (she cannot override it)', async ({ request }) => {
    const other = await family(null, 'غيداء');
    const lesson = await seedLesson({ teacherId: teacher, studentId: other.student, startsAt: riyadh(tuesdayTwo, '19:30'), minutes: 45 });
    try {
      const res = await book(request, need(a).token, course());
      expect([res.status, res.body.code]).toEqual([409, 'conflict']);
      const override = await book(request, need(a).token, course({ override: { reason: 'سبب' } }));
      expect(override.body.code).toBe('override_not_allowed');
    } finally {
      await withSql((sql) => sql`delete from public.lessons where id = ${lesson}`);
    }
  });

  test('Sun 17:00 + Tue 19:30 → 201: exactly 8 lessons over two rules, both created by her and ending together', async ({ request }) => {
    const me = need(a);
    const res = await book(request, me.token, course());
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.lessons).toHaveLength(8);
    const rules = await withSql((sql) => sql<{ start: string; created_by: string; ends_on: string; first_rule_id: string | null; invoices: number }[]>`
      select r.start_time_local::text as start, r.created_by, r.ends_on::text as ends_on, r.first_rule_id,
        (select count(*)::int from public.invoices i where i.rule_id = r.id) as invoices
      from public.schedule_rules r join public.schedule_rule_students rs on rs.rule_id = r.id
      where rs.student_id = ${student} order by r.first_rule_id nulls first`);
    expect(rules.map((r) => [r.start.slice(0, 5), r.created_by, r.invoices])).toEqual([['17:00', me.id, 0], ['19:30', me.id, 0]]);
    expect(rules[1]?.first_rule_id).toBe(res.body.rule_id);
    expect(new Set(rules.map((r) => r.ends_on))).toEqual(new Set([addDays(sunday, 23)]));
    const [count] = await withSql((sql) => sql<{ n: number }[]>`select count(*)::int as n from public.lesson_students where student_id = ${student}`);
    expect(count?.n).toBe(8);
  });

  test('a second course overlapping the first is 409 course_exists; the wizard now shows it blocked', async ({ request }) => {
    const token = need(a).token;
    const res = await book(request, token, course({ startTimeLocal: '20:00', dayTimes: undefined, startsAt: riyadh(sunday, '20:00').toISOString() }));
    expect([res.status, res.body.code]).toEqual([409, 'course_exists']);
    const view = await call<SalesCourseView>(request, { token, method: 'GET', path: `/sales/booking/course?studentId=${student}` });
    expect(view.body.blocked).toBe('course_exists');
  });
});
