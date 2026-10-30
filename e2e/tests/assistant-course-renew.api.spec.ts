import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { BookingResult, CourseChangeCheck, CourseChangeResult, SalesCourseView, SalesMoneySubscriptionView } from '@ab/shared';
import { call, family, makeAssistant, type Assistant } from '../support/assistant-api';
import { countedLessons, courseAudit, courseRules, renewal } from '../support/finance/course-renew';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, seedLesson, setAvailability, withSql } from '../support/schedule';

// Owner 2026-10-18, through the REAL API and database: the assistant books an 8-lesson course (Sun 17:00 +
// Tue 19:30), changes its days from the second week (Mon 18:00 + Wed 20:00: the course still has exactly 8
// lessons), then a renewal continues on the same days and times after its last day, tied to the NEW plan.

const need = <T>(v: T | undefined): T => {
  if (v === undefined) throw new Error('an earlier step did not run');
  return v;
};

test.describe.serial('sales: change a course’s days, then continue it on renewal (API + DB)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  let teacher = '';
  let a: Assistant | undefined;
  let student = '';
  let first = '';
  const sunday = addDays(nextWeekSaturday(), 1);
  const monday = addDays(sunday, 8);
  const change = (over: object = {}) => ({
    subscriptionId: first, byday: [1, 3], startTimeLocal: '18:00', dayTimes: [{ weekday: 3, startTimeLocal: '20:00' }],
    startsOn: monday, startsAt: riyadh(monday, '18:00').toISOString(), clientRequestId: randomUUID(), ...over,
  });

  test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext();
    teacher = await resetAbrar();
    await setAvailability(teacher, [[0, '08:00', '22:00'], [1, '08:00', '22:00'], [2, '08:00', '22:00'], [3, '08:00', '22:00']]);
    a = await makeAssistant('renewa');
    student = (await family(need(a).id, 'لمى')).student;
    const sub = await call<SalesMoneySubscriptionView>(ctx, {
      token: need(a).token, method: 'POST', path: '/sales/subscriptions',
      body: { studentId: student, pricing: { tier: 'starter', duration: 45 }, clientRequestId: randomUUID() },
    });
    expect(sub.status, JSON.stringify(sub.body)).toBe(201);
    first = sub.body.id;
    const booked = await call<BookingResult>(ctx, {
      token: need(a).token, method: 'POST', path: '/sales/booking',
      body: {
        teacherId: teacher, byday: [0, 2], startTimeLocal: '17:00', dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
        tz: 'Asia/Riyadh', durationMin: 45, startsOn: sunday, startsAt: riyadh(sunday, '17:00').toISOString(),
        package: '8', studentIds: [student], clientRequestId: randomUUID(),
      },
    });
    expect(booked.status, JSON.stringify(booked.body)).toBe(201);
    await ctx.dispose();
  });

  test('change check: 3 lessons before Monday of week 2 → 5 remain, the last on Mon of week 4', async ({ request }) => {
    const res = await call<CourseChangeCheck>(request, { token: need(a).token, method: 'POST', path: '/sales/booking/course/change/check', body: change() });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toEqual({ conflicts: [], remaining: 5, endsOn: addDays(sunday, 22) });
  });

  test('a clash on the new days is 409 conflict for her', async ({ request }) => {
    const other = await family(null, 'ريم');
    const lesson = await seedLesson({ teacherId: teacher, studentId: other.student, startsAt: riyadh(addDays(monday, 2), '20:00'), minutes: 45 });
    try {
      const res = await call<{ code: string }>(request, { token: need(a).token, method: 'POST', path: '/sales/booking/course/change', body: change() });
      expect([res.status, res.body.code]).toEqual([409, 'conflict']);
    } finally {
      await withSql((sql) => sql`delete from public.lessons where id = ${lesson}`);
    }
  });

  test('change → 201: old rules end Sunday of week 2, new rules carry the course; still exactly 8 lessons', async ({ request }) => {
    const body = change();
    const res = await call<CourseChangeResult>(request, { token: need(a).token, method: 'POST', path: '/sales/booking/course/change', body });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body).toMatchObject({ subscriptionId: first, endsOn: addDays(sunday, 22) });
    const again = await call<CourseChangeResult>(request, { token: need(a).token, method: 'POST', path: '/sales/booking/course/change', body });
    expect([again.status, again.body.ruleIds]).toEqual([201, res.body.ruleIds]);
    expect(await countedLessons(first)).toBe(8);
    const rules = await courseRules(first);
    expect(rules.map((r) => [r.start, r.ends_on])).toEqual([
      ['17:00', addDays(sunday, 7)], ['19:30', addDays(sunday, 7)], ['18:00', addDays(sunday, 22)], ['20:00', addDays(sunday, 22)],
    ]);
    expect(await courseAudit(first)).toContainEqual({ action: 'course_change', actor_id: need(a).id, by: 'sales' });
  });

  test('renewal: GET course offers the previous days; the same days after its last day book 8 lessons on the NEW plan', async ({ request }) => {
    const token = need(a).token;
    const second = await renewal(student);
    const view = await call<SalesCourseView>(request, { token, method: 'GET', path: `/sales/booking/course?studentId=${student}` });
    expect(view.status, JSON.stringify(view.body)).toBe(200);
    expect(view.body.blocked).toBeNull();
    expect(view.body.previous).toMatchObject({
      subscriptionId: first, teacherId: teacher, endsOn: addDays(sunday, 22),
      days: [{ weekday: 1, startTimeLocal: '18:00' }, { weekday: 3, startTimeLocal: '20:00' }],
    });
    const wednesday = addDays(sunday, 24); // the first Wednesday after the previous course's last Monday
    const res = await call<BookingResult>(request, {
      token, method: 'POST', path: '/sales/booking',
      body: {
        teacherId: teacher, byday: [1, 3], startTimeLocal: '20:00', dayTimes: [{ weekday: 1, startTimeLocal: '18:00' }],
        tz: 'Asia/Riyadh', durationMin: 45, startsOn: wednesday, startsAt: riyadh(wednesday, '20:00').toISOString(),
        package: '8', studentIds: [student], clientRequestId: randomUUID(),
      },
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(await countedLessons(second)).toBe(8);
    expect(new Set((await courseRules(second)).map((r) => r.ends_on))).toEqual(new Set([addDays(sunday, 50)]));
    expect(await courseAudit(second)).toContainEqual({ action: 'book', actor_id: need(a).id, by: 'sales' });
  });
});
