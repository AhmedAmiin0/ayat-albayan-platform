import { expect, test } from '@playwright/test';
import type { AssistantStatementView, MyEarnings, MyPaymentRow, MyStudentRow } from '@ab/shared';
import { call, dayOffset, family, makeAssistant, paymentBy, thisMonth, tokenOf, type Assistant, type Family } from '../../support/assistant-api';
import { money } from '../../support/finance/assistant-money';
import { USERS } from '../../support/users';

// The month's statement and the assistant's own pages through the REAL API and database (R-ASST-03,
// R-ASST-04, R-ASST-06). P has a salary of 1000 SAR and 10 percent; two of her students pay in full, one
// in SAR and one in USD: the statement keeps one block per currency and sums nothing across them.
// Q is another assistant with her own student and payment: neither sees the other's rows.

const need = <T>(v: T | undefined): T => {
  if (v === undefined) throw new Error('an earlier step did not run');
  return v;
};

test.describe.serial('assistant statement and own pages (API + DB)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  let admin = '';
  let p: Assistant | undefined;
  let q: Assistant | undefined;
  let sar: Family | undefined;
  let usd: Family | undefined;
  let other: Family | undefined;
  let statement: AssistantStatementView | undefined;
  const get = <T>(token: string, path: string, request: Parameters<typeof call>[0]) => call<T>(request, { token, method: 'GET', path });

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    admin = await tokenOf(USERS.admin.email, USERS.admin.password);
    const m = money(request, admin);
    p = await makeAssistant('p');
    q = await makeAssistant('q');
    const startsOn = dayOffset(0); // today in Riyadh: a start day cannot be in the past, nothing is retroactive
    const terms = { commission: { type: 'percent', value: 10, startsOn }, salary: { amount: 1000, currency: 'SAR', startsOn } };
    await call(request, { token: admin, method: 'PUT', path: `/assistant-pay/terms/${p.id}`, body: terms });
    sar = await family(p.id, 'سارة');
    usd = await family(p.id, 'يوسف');
    other = await family(q.id, 'ليان');
    const pounds = await m.subscribe(sar.student, 'SA');
    await m.payIn(pounds, pounds.price);
    const dollars = await m.subscribe(usd.student, 'US');
    await m.payIn(dollars, dollars.price);
    const extra = await m.subscribe(sar.student, 'SA');
    await paymentBy(extra.id, p.id, 10);
    const hers = await m.subscribe(other.student, 'SA');
    await paymentBy(hers.id, q.id, 25);
  });

  test('the ledger: one commission in SAR (10 percent of 120) and one in USD (10 percent of the dollar price), never mixed', async ({ request }) => {
    const m = money(request, admin);
    const rows = await m.ledger(need(p).id);
    expect(rows.map((r) => [r.currency, r.status]).sort()).toEqual([['SAR', 'earned'], ['USD', 'earned']]);
    expect(rows.find((r) => r.currency === 'SAR')?.amount).toBe(12);
    expect(rows.find((r) => r.currency === 'USD')?.amount).toBe(Math.round((rows.find((r) => r.currency === 'USD')?.base_amount ?? 0) * 10) / 100);
  });

  test('generate: salary + commissions per currency (SAR 1000 + 12; USD commission only); generating again changes nothing', async ({ request }) => {
    const month = thisMonth();
    const body = { assistantId: need(p).id, month };
    const res = await call<AssistantStatementView>(request, { token: admin, method: 'POST', path: '/assistant-pay/statements', body });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    statement = res.body;
    expect(statement.status).toBe('draft');
    expect(statement.totals['SAR']).toMatchObject({ salary: 1000, commissions: 12, adjustments: 0, total: 1012 });
    expect(Object.keys(statement.totals).sort()).toEqual(['SAR', 'USD']);
    expect(statement.totals['USD']).toMatchObject({ salary: 0, adjustments: 0 });
    const again = await call<AssistantStatementView>(request, { token: admin, method: 'POST', path: '/assistant-pay/statements', body });
    expect([again.body.id, again.body.totals]).toEqual([statement.id, statement.totals]);
  });

  test('approve, then pay: a paid statement is frozen (generate answers 409 invalid_transition)', async ({ request }) => {
    const id = need(statement).id;
    const approved = await call<AssistantStatementView>(request, { token: admin, method: 'POST', path: `/assistant-pay/statements/${id}/approve` });
    expect([approved.status, approved.body.status]).toEqual([200, 'approved']);
    const pay = { paidAt: new Date().toISOString(), method: 'bank', note: null, receiptPath: null };
    const paid = await call<AssistantStatementView>(request, { token: admin, method: 'POST', path: `/assistant-pay/statements/${id}/pay`, body: pay });
    expect([paid.status, paid.body.status]).toEqual([200, 'paid']);
    const frozen = await call(request, { token: admin, method: 'POST', path: '/assistant-pay/statements', body: { assistantId: need(p).id, month: thisMonth() } });
    expect([frozen.status, frozen.body]).toMatchObject([409, { code: 'invalid_transition' }]);
  });

  test('as P: her students (with their commission), her earnings (paid statement, per currency) and the payment she recorded', async ({ request }) => {
    const me = need(p);
    const students = await get<MyStudentRow[]>(me.token, '/sales/me/students', request);
    expect(students.body.map((s) => s.id).sort()).toEqual([need(sar).student, need(usd).student].sort());
    expect(students.body.every((s) => s.first_subscription_paid && s.commission?.status === 'earned')).toBe(true);
    expect(JSON.stringify(students.body)).not.toMatch(/price|notes|fx_|receipt/);
    const earnings = await get<MyEarnings>(me.token, '/sales/me/earnings', request);
    expect(earnings.body.terms).toMatchObject({ commission: { type: 'percent', value: 10 }, salary: { amount: 1000, currency: 'SAR' } });
    expect(earnings.body.commissions_total['SAR']).toBe(12);
    expect(earnings.body.statements.map((s) => [s.status, s.totals['SAR']?.total])).toEqual([['paid', 1012]]);
    const pays = await get<MyPaymentRow[]>(me.token, '/sales/me/payments', request);
    expect(pays.body.map((r) => [r.amount, r.currency])).toEqual([[10, 'SAR']]);
  });

  test('as Q: only her own student, payment and an empty earnings page; nothing of P, and no draft or other statement', async ({ request }) => {
    const me = need(q);
    const students = await get<MyStudentRow[]>(me.token, '/sales/me/students', request);
    expect(students.body.map((s) => s.id)).toEqual([need(other).student]);
    expect(students.body[0]?.commission).toBeNull();
    const earnings = await get<MyEarnings>(me.token, '/sales/me/earnings', request);
    expect([earnings.body.terms?.commission ?? null, earnings.body.statements, earnings.body.commissions_total]).toEqual([null, [], {}]);
    const pays = await get<MyPaymentRow[]>(me.token, '/sales/me/payments', request);
    expect(pays.body.map((r) => r.amount)).toEqual([25]);
  });
});
