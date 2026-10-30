import { expect, test } from '@playwright/test';
import type { ThreadDetail, ThreadView } from '@ab/shared';
import { call, family, makeAssistant, message, tokenOf, type Assistant, type Family } from '../../support/sales/assistant-api';
import { money } from '../../support/finance/assistant-money';
import { USERS } from '../../support/core/users';

// What an assistant may NOT see or do, through the REAL API and database (R-ASST-04): the money routes
// answer 403. Since docs/16 (owner 2026-10-11) she reads every chat, still with no money in it.

test.describe.serial('assistant scope: money routes and chats (API + DB)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  let admin = '';
  let mine: Assistant | undefined;
  let theirs: Assistant | undefined;
  let own: Family | undefined;
  let foreign: Family | undefined;
  let stranger: Family | undefined;
  const need = <T>(v: T | undefined): T => {
    if (v === undefined) throw new Error('an earlier step did not run');
    return v;
  };

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext();
    admin = await tokenOf(USERS.admin.email, USERS.admin.password);
    const m = money(request, admin);
    mine = await makeAssistant('m');
    theirs = await makeAssistant('t');
    own = await family(mine.id, 'هدى');
    foreign = await family(theirs.id, 'نور');
    stranger = await family(null, 'مها');
    await m.subscribe(own.student, 'SA');
    for (const f of [own, foreign, stranger]) await message({ phone: f.phone, guardian: f.guardian, direction: 'inbound', body: 'السلام عليكم' });
    await message({ phone: own.phone, guardian: own.guardian, direction: 'outbound', body: 'رابط الدخول', template: 'lesson_join_link' });
    await message({ phone: own.phone, guardian: own.guardian, direction: 'outbound', body: 'حان موعد التجديد', template: 'renewal_due' });
  });

  const ROUTES: [string, string][] = [
    ['GET', '/payments'], ['GET', '/subscriptions'], ['GET', '/students'], ['GET', '/guardians'], ['GET', '/payouts'],
    ['GET', '/assistant-pay/terms'], ['GET', '/assistant-pay/commissions'], ['GET', '/assistant-pay/statements'], ['GET', '/settings'],
  ];

  test('the money routes answer 403 to her, 401 without a login, and the write routes 403 too', async ({ request }) => {
    const token = need(mine).token;
    for (const [method, path] of ROUTES) {
      const res = await call(request, { token, method: method as 'GET', path });
      expect([path, res.status]).toEqual([path, 403]);
      expect([path, (await call(request, { token: null, method: 'GET', path })).status]).toEqual([path, 401]);
    }
    const pay = { subscriptionId: need(own).student, amount: 10, currency: 'SAR', method: 'bank', paidAt: new Date().toISOString() };
    expect((await call(request, { token, method: 'POST', path: '/payments', body: pay })).status).toBe(403);
    const brought = { studentIds: [need(foreign).student], assistantId: need(mine).id };
    expect((await call(request, { token, method: 'POST', path: '/assistant-pay/brought-by', body: brought })).status).toBe(403);
  });

  test('chats: every family opens to her (docs/16), with the money flag off', async ({ request }) => {
    for (const f of [need(own), need(foreign), need(stranger)]) {
      const path = `/threads?search=${f.phone.slice(1)}`;
      const list = await call<{ items: ThreadView[] }>(request, { token: need(mine).token, method: 'GET', path });
      expect(list.body.items.map((t) => [t.phone_e164, t.unpaid])).toEqual([[f.phone, false]]);
      const res = await call<ThreadDetail>(request, { token: need(mine).token, method: 'GET', path: `/threads/${encodeURIComponent(f.phone)}` });
      expect([f.phone, res.status]).toEqual([f.phone, 200]);
    }
  });

  test('her chat: no join link, no package or price in the family; the admin sees both of them', async ({ request }) => {
    const path = `/threads/${encodeURIComponent(need(own).phone)}`;
    const mineView = await call<ThreadDetail>(request, { token: need(mine).token, method: 'GET', path });
    const adminView = await call<ThreadDetail>(request, { token: admin, method: 'GET', path });
    const keys = (d: ThreadDetail) => d.messages.map((m) => m.template_key ?? 'text').sort();
    expect(keys(mineView.body)).toEqual(['renewal_due', 'text']);
    expect(keys(adminView.body)).toEqual(['lesson_join_link', 'renewal_due', 'text']);
    expect(mineView.body.people.students.map((s) => s.subscription)).toEqual([null]);
    expect(adminView.body.people.students.some((s) => s.subscription !== null)).toBe(true);
    expect(JSON.stringify(mineView.body)).not.toMatch(/"price"|"balance"|"paid"/);
  });
});
