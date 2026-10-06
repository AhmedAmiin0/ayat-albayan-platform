import { expect, test } from '@playwright/test';
import type { AssistantCommissionView, BookingResult } from '@ab/shared';
import { call, dayOffset, freshPhone, leadOf, makeAssistant, tokenOf, trialBody, type Assistant } from '../support/assistant-api';
import { cents, money } from '../support/assistant-money';
import { resetAbrar, setAvailability, withSql } from '../support/schedule';
import { USERS } from '../support/users';

// The money journey of an assistant through the REAL API and database (R-ASST-01, R-ASST-02): she
// registers a student from her chat (POST /sales/booking, her as the actor), the student is credited
// to her, and the commission follows the payments: none while partly paid, once when fully paid,
// never twice, voided when a payment is deleted. Two terms: 10 percent and a fixed 50 SAR.

type Reg = { student: string; phone: string };
const need = <T>(v: T | undefined): T => {
  if (v === undefined) throw new Error('an earlier step did not run');
  return v;
};

test.describe.serial('assistant money: registration and commission (API + DB)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  let admin = '';
  let teacher = '';
  let a: Assistant | undefined;
  let c: Assistant | undefined;
  let regA: Reg | undefined;
  const subs: { price: number; id: string; currency: string; payments: string[] }[] = [];

  test.beforeAll(async () => {
    admin = await tokenOf(USERS.admin.email, USERS.admin.password);
    teacher = await resetAbrar();
    await setAvailability(teacher, [[6, '08:00', '22:00']]);
    a = await makeAssistant('a');
    c = await makeAssistant('c');
  });

  const register = async (request: Parameters<typeof call>[0], who: Assistant, time: string): Promise<Reg> => {
    const phone = freshPhone();
    const leadId = await leadOf(who.id, phone);
    const res = await call<BookingResult>(request, { token: who.token, method: 'POST', path: '/sales/booking', body: trialBody({ teacherId: teacher, leadId, phone, name: `طالب${time.slice(0, 2)}`, time }) });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    return { student: need(res.body.student_ids[0]), phone };
  };

  test('terms: the admin sets 10 percent for A and a fixed 50 SAR for C; an assistant cannot', async ({ request }) => {
    const startsOn = dayOffset(-1);
    const putA = await call(request, { token: admin, method: 'PUT', path: `/assistant-pay/terms/${need(a).id}`, body: { commission: { type: 'percent', value: 10, startsOn }, salary: { amount: 1000, currency: 'SAR', startsOn: `${startsOn.slice(0, 7)}-01` } } });
    const putC = await call(request, { token: admin, method: 'PUT', path: `/assistant-pay/terms/${need(c).id}`, body: { commission: { type: 'fixed', value: 50, currency: 'SAR', startsOn }, salary: null } });
    expect([putA.status, putC.status]).toEqual([200, 200]);
    expect(putC.body).toMatchObject({ commission: { type: 'fixed', value: 50, currency: 'SAR' }, salary: null });
    const own = await call(request, { token: need(a).token, method: 'PUT', path: `/assistant-pay/terms/${need(a).id}`, body: { commission: { type: 'percent', value: 100, startsOn }, salary: null } });
    expect(own.status).toBe(403);
  });

  test('A registers a student from her own chat: booked, credited to her (brought_by/brought_at), nothing else is hers to book', async ({ request }) => {
    const me = need(a);
    const teachers = await call<{ id: string; meeting_link: string | null }[]>(request, { token: me.token, method: 'GET', path: '/sales/booking/teachers?program=quran' });
    expect(teachers.body.map((t) => t.id)).toContain(teacher);
    expect(teachers.body.every((t) => t.meeting_link === null)).toBe(true);
    regA = await register(request, me, '17:00');
    const [row] = await withSql((sql) => sql<{ brought_by: string; brought_at: Date | null }[]>`select brought_by, brought_at from public.students where id = ${regA?.student ?? ''}`);
    expect(row?.brought_by).toBe(me.id);
    expect(row?.brought_at).not.toBeNull();
    const view = await call(request, { token: admin, method: 'GET', path: `/assistant-pay/brought-by/${need(regA).student}` });
    expect(view.body).toMatchObject({ assistant: { id: me.id } });
    const othersLead = await leadOf(need(c).id, freshPhone());
    const stolen = await call(request, { token: me.token, method: 'POST', path: '/sales/booking', body: trialBody({ teacherId: teacher, leadId: othersLead, phone: freshPhone(), name: 'غريب', time: '18:00' }) });
    expect([stolen.status, stolen.body]).toMatchObject([403, { code: 'not_your_lead' }]);
    const mine = await leadOf(me.id, freshPhone());
    const typed = await call(request, { token: me.token, method: 'POST', path: '/sales/booking', body: trialBody({ teacherId: teacher, leadId: mine, phone: freshPhone(), name: 'غريب', time: '18:00' }) });
    expect([typed.status, typed.body]).toMatchObject([403, { code: 'not_your_family' }]);
  });

  test('10 percent: a partial payment earns nothing; the final payment earns exactly one commission in the package currency', async ({ request }) => {
    const m = money(request, admin);
    const me = need(a);
    const sub = await m.subscribe(need(regA).student, 'SA');
    const partial = cents(sub.price * 0.4);
    const first = await m.payIn(sub, partial);
    expect(await m.ledger(me.id)).toEqual([]);
    const last = await m.payIn(sub, sub.price - partial);
    subs.push({ ...sub, payments: [first, last] });
    const rows = await m.ledger(me.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'earned', type: 'percent', rate: 10, base_amount: sub.price, base_currency: sub.currency, currency: 'SAR', subscription_id: sub.id, amount: Math.round(sub.price * 10) / 100 });
  });

  test('a second package of the same student, paid in full later, earns no second commission', async ({ request }) => {
    const m = money(request, admin);
    const sub = await m.subscribe(need(regA).student, 'SA');
    subs.push({ ...sub, payments: [await m.payIn(sub, sub.price)] });
    expect(await m.ledger(need(a).id)).toHaveLength(1);
  });

  test('deleting the first payment: the first package is no longer full, so the commission moves to the next full one (same row, 10 percent of that price)', async ({ request }) => {
    const m = money(request, admin);
    const [one, two] = [need(subs[0]), need(subs[1])];
    const del = await call(request, { token: admin, method: 'DELETE', path: `/payments/${need(one.payments[0])}` });
    expect(del.status).toBe(204);
    const rows = await m.ledger(need(a).id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'earned', subscription_id: two.id, base_amount: two.price, amount: Math.round(two.price * 10) / 100 });
  });

  test('deleting the payment of the only other full package voids the commission (automatic, kept for a later full payment)', async ({ request }) => {
    const m = money(request, admin);
    const two = need(subs[1]);
    expect((await call(request, { token: admin, method: 'DELETE', path: `/payments/${need(two.payments[0])}` })).status).toBe(204);
    const rows = await m.ledger(need(a).id);
    expect(rows.map((r: AssistantCommissionView) => r.status)).toEqual(['voided']);
    const [auto] = await withSql((sql) => sql<{ void_auto: boolean }[]>`select void_auto from public.assistant_commissions where student_id = ${need(regA).student}`);
    expect(auto?.void_auto).toBe(true);
  });

  test('fixed 50 SAR: C registers a student; partial = nothing; final = exactly 50 SAR, whatever the price', async ({ request }) => {
    const m = money(request, admin);
    const me = need(c);
    const reg = await register(request, me, '19:00');
    const sub = await m.subscribe(reg.student, 'SA');
    await m.payIn(sub, cents(sub.price * 0.3));
    expect(await m.ledger(me.id)).toEqual([]);
    await m.payIn(sub, sub.price - cents(sub.price * 0.3));
    const rows = await m.ledger(me.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'earned', type: 'fixed', rate: 50, amount: 50, currency: 'SAR', base_amount: sub.price });
  });
});
