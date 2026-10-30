import { randomUUID } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';
import type { TrialDateResult, TrialHistory } from '@ab/shared';
import { call, family, makeAssistant, type Assistant } from '../../support/sales/assistant-api';
import { addDays, nextWeekSaturday, resetAbrar, riyadh, setAvailability, withSql } from '../../support/schedule';

// Owner 2026-10-25 «موعد تجريبي جديد», through the REAL API and database: her student's trial is
// booked, then a new date MOVES it (the old one stays as «نُقلت»), a retry is a replay, the history
// shows both with the count; another assistant and a subscriber are refused.

const need = <T>(v: T | undefined): T => {
  if (v === undefined) throw new Error('an earlier step did not run');
  return v;
};

test.describe.serial('sales: a new trial date for her student (API + DB)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  let teacher = '';
  let a: Assistant | undefined;
  let b: Assistant | undefined;
  let student = '';
  const sunday = addDays(nextWeekSaturday(), 1);
  const trial = (time: string, over: object = {}) => ({
    teacherId: teacher, byday: [0], startTimeLocal: time, tz: 'Asia/Riyadh', durationMin: 30, startsOn: sunday,
    startsAt: riyadh(sunday, time).toISOString(), package: 'trial', studentIds: [student], clientRequestId: randomUUID(), ...over,
  });
  const pick = (request: APIRequestContext, token: string, body: object) =>
    call<TrialDateResult & { code?: string }>(request, { token, method: 'POST', path: '/sales/booking/trial-date', body });
  const history = (request: APIRequestContext) =>
    call<TrialHistory>(request, { token: need(a).token, method: 'GET', path: `/sales/booking/trial-dates?studentId=${student}` });

  test.beforeAll(async () => {
    teacher = await resetAbrar();
    await setAvailability(teacher, [[0, '08:00', '22:00']]);
    a = await makeAssistant('triala');
    b = await makeAssistant('trialb');
    student = (await family(need(a).id, 'لمى')).student;
  });

  test('no upcoming trial: a new trial lesson; the student → trial; one date in the history', async ({ request }) => {
    const first = await pick(request, need(a).token, trial('17:00'));
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    expect(first.body.moved_from_id).toBeNull();
    const [row] = await withSql((sql) => sql<{ status: string }[]>`select status::text from public.students where id = ${student}`);
    expect(row?.status).toBe('trial');
    const h = await history(request);
    expect([h.body.count, h.body.items[0]?.outcome, h.body.upcoming_id]).toEqual([1, 'upcoming', first.body.lesson_id]);
  });

  test('a new date moves the upcoming trial; a retry with the same id is a replay', async ({ request }) => {
    const body = trial('19:00');
    const moved = await pick(request, need(a).token, body);
    expect(moved.status, JSON.stringify(moved.body)).toBe(201);
    const again = await pick(request, need(a).token, body);
    expect(again.body).toEqual(moved.body);
    const h = await history(request);
    expect(h.body.count).toBe(2);
    expect(h.body.items.map((r) => r.outcome)).toEqual(['upcoming', 'moved']);
    expect(h.body.items[0]?.moved_from_id).toBe(moved.body.moved_from_id);
    expect(h.body.items[0]?.picked_by).not.toBeNull();
  });

  test('another assistant’s student is 403 (history and pick); a clash override is 403', async ({ request }) => {
    const other = await pick(request, need(b).token, trial('20:00'));
    const read = await call(request, { token: need(b).token, method: 'GET', path: `/sales/booking/trial-dates?studentId=${student}` });
    const over = await pick(request, need(a).token, trial('20:00', { override: { reason: 'سبب' } }));
    expect([other.status, other.body.code, read.status, over.body.code]).toEqual([403, 'not_your_student', 403, 'override_not_allowed']);
  });

  test('a subscribed student is refused with trial_date_subscribed', async ({ request }) => {
    await withSql((sql) => sql`update public.students set status = 'active' where id = ${student}`);
    const res = await pick(request, need(a).token, trial('20:00'));
    expect([res.status, res.body.code]).toEqual([409, 'trial_date_subscribed']);
    expect((await history(request)).body.allowed).toBe(false);
  });
});
