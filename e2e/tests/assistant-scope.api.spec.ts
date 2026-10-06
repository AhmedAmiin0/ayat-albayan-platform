import { expect, test } from '@playwright/test';
import type { ThreadDetail, ThreadView } from '@ab/shared';
import { call, family, makeAssistant, message, tokenOf, type Assistant, type Family } from '../support/assistant-api';
import { subscribe } from '../support/assistant-money';
import { USERS } from '../support/users';

// What an assistant may NOT see or do, through the REAL API and database (R-ASST-04): the money routes
// answer 403, and the chats are only those of the families she brought, with no money in them.

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
    mine = await makeAssistant('m');
    theirs = await makeAssistant('t');
    own = await family(mine.id, 'هدى');
    foreign = await family(theirs.id, 'نور');
    stranger = await family(null, 'مها');
    await subscribe(request, admin, own.student, 'SA');
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

  test('chats: her list holds only the family she brought; the other chats are 403; the money flag is off', async ({ request }) => {
    const list = await call<{ items: ThreadView[] }>(request, { token: need(mine).token, method: 'GET', path: '/threads' });
    expect(list.status).toBe(200);
    expect(list.body.items.map((t) => t.phone_e164)).toEqual([need(own).phone]);
    expect(list.body.items.every((t) => t.unpaid === false)).toBe(true);
    for (const f of [need(foreign), need(stranger)]) {
      const res = await call(request, { token: need(mine).token, method: 'GET', path: `/threads/${encodeURIComponent(f.phone)}` });
      expect([res.status, res.body]).toMatchObject([403, { code: 'not_your_thread' }]);
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
