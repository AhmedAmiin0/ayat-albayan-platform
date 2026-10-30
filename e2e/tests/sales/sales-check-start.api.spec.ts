import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { RegistrationCheckView, SalesMoneySubscriptionView } from '@ab/shared';
import { call, makeAssistant, tokenOf, type Assistant } from '../../support/sales/assistant-api';
import { freshDigits } from '../../support/messages';
import { trialFamily } from '../../support/sales/sales-money';
import { resetSales, revokeFromSales, riyadhDay } from '../../support/sales/sales-options';
import { USERS } from '../../support/users';

// Owner 2026-10-12 (docs/16 rows 23, 24, 26), through the REAL API and database: a salesperson checks a
// registered number and a new one («التحقق من التسجيل»), sets the start date («تحديد تاريخ بداية الاشتراك»,
// a past one only when «بدأ الاشتراك سابقًا»), and the admin switches both options off on the built-in
// sales role, then restores the defaults (afterAll too, so no later spec runs without them).

const need = <T>(v: T | undefined): T => {
  if (v === undefined) throw new Error('an earlier step did not run');
  return v;
};

test.describe.serial('sales registration check and start date (API + DB)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  const digits = freshDigits();
  const phone = `+${digits}`;
  const name = `ريحانة${digits.slice(-4)}`;
  let a: Assistant | undefined;
  let admin = '';
  let student = '';

  test.beforeAll(async () => {
    admin = await tokenOf(USERS.admin.email, USERS.admin.password);
    a = await makeAssistant('chk');
    student = await trialFamily({ broughtBy: need(a).id, phone, name });
  });
  test.afterAll(async ({ request }) => {
    await resetSales(request, admin);
  });

  const check = (request: Parameters<typeof call>[0], query: string) =>
    call<RegistrationCheckView>(request, { token: need(a).token, method: 'GET', path: `/sales/registration-check?${query}` });

  test('a registered number: found, name / code / status / teacher only', async ({ request }) => {
    const res = await check(request, `phone=${encodeURIComponent(phone)}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.matches.map((m) => [m.name, m.status])).toEqual([[name, 'trial']]);
    expect(Object.keys(res.body.matches[0] ?? {}).sort()).toEqual(['code', 'name', 'status', 'teacher_name']);
    expect(JSON.stringify(res.body)).not.toContain(digits);
  });

  test('a new number: not found; a name finds the child; two letters are refused', async ({ request }) => {
    const fresh = await check(request, `phone=${encodeURIComponent(`+9665${String(Date.now() + 7).slice(-8)}`)}`);
    expect(fresh.body).toEqual({ found: false, matches: [], more: false });
    const byName = await check(request, `q=${encodeURIComponent(name)}`);
    expect(byName.body.matches.map((m) => m.name)).toContain(name);
    const short = await call<{ issues: { message: string }[] }>(request, { token: need(a).token, method: 'GET', path: `/sales/registration-check?q=${encodeURIComponent('ري')}` });
    expect([short.status, short.body.issues.map((i) => i.message)]).toEqual([400, ['query_too_short']]);
  });

  test('with the option: a future day is kept, a past day needs «already started»', async ({ request }) => {
    const subscribe = (body: object) =>
      call<SalesMoneySubscriptionView>(request, { token: need(a).token, method: 'POST', path: '/sales/subscriptions', body: { studentId: student, pricing: { tier: 'starter' }, clientRequestId: randomUUID(), ...body } });
    const past = await subscribe({ startsOn: riyadhDay(-30) });
    expect([past.status, (past.body as unknown as { code: string }).code]).toEqual([400, 'start_date_past']);
    const old = await subscribe({ startsOn: riyadhDay(-400), alreadyStarted: true });
    expect([old.status, (old.body as unknown as { code: string }).code]).toEqual([400, 'start_date_too_old']);
    const started = await subscribe({ startsOn: riyadhDay(-30), alreadyStarted: true });
    expect([started.status, started.body.starts_on]).toEqual([201, riyadhDay(-30)]);
  });

  test('the admin switches both options off: 403 on the check and on an explicit day; the default day still works', async ({ request }) => {
    await revokeFromSales(request, { admin, permission: 'subscriptions.set_start_date' });
    await revokeFromSales(request, { admin, permission: 'students.check_registration' });
    const denied = await check(request, `phone=${encodeURIComponent(phone)}`);
    expect(denied.status).toBe(403);
    const base = { studentId: student, pricing: { tier: 'starter' } };
    const explicit = await call(request, { token: need(a).token, method: 'POST', path: '/sales/subscriptions', body: { ...base, startsOn: riyadhDay(5), clientRequestId: randomUUID() } });
    expect([explicit.status, explicit.body['code']]).toEqual([403, 'start_date_not_allowed']);
    const plain = await call<SalesMoneySubscriptionView>(request, { token: need(a).token, method: 'POST', path: '/sales/subscriptions', body: { ...base, clientRequestId: randomUUID() } });
    expect([plain.status, plain.body.starts_on]).toEqual([201, riyadhDay()]);
  });

  test('«استعادة الافتراضي» gives both back', async ({ request }) => {
    const role = await resetSales(request, admin);
    expect(role.permissions).toEqual(expect.arrayContaining(['students.check_registration', 'subscriptions.set_start_date']));
    expect((await check(request, `phone=${encodeURIComponent(phone)}`)).status).toBe(200);
  });
});
