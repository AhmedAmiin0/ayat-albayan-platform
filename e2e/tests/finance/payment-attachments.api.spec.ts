import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { PaymentAttachmentView, SalesMoneySubscriptionView } from '@ab/shared';
import { call, makeAssistant, tokenOf, type Assistant } from '../../support/sales/assistant-api';
import { freshDigits } from '../../support/messages';
import { PNG, trialFamily, uploadReceipt } from '../../support/sales/sales-money';
import { USERS } from '../../support/users';

// «المرفقات» of a bank transfer (owner 2026-10-12, docs/16 row 25, docs/11 §7), through the REAL API,
// database and storage: the admin records a bank transfer with two attachments (and is refused them on a
// cash payment); the salesperson records a transfer with NO receipt (optional now, old students) and one
// with an attachment, and reads only her own payment's files.

const need = <T>(v: T | undefined): T => {
  if (v === undefined) throw new Error('an earlier step did not run');
  return v;
};

/** POST /payments/receipt-upload-url as the admin, then PUT the PNG: the path. */
async function adminUpload(request: Parameters<typeof call>[0], input: { admin: string; subscriptionId: string }): Promise<string> {
  const body = { subscriptionId: input.subscriptionId, mime: 'image/png', size: PNG.byteLength };
  const signed = await call<{ path: string; signed_url: string }>(request, { token: input.admin, method: 'POST', path: '/payments/receipt-upload-url', body });
  const put = await request.fetch(signed.body.signed_url, { method: 'PUT', data: PNG, headers: { 'content-type': 'image/png' } });
  if (!put.ok()) throw new Error(`upload ${put.status()}`);
  return signed.body.path;
}

test.describe.serial('bank-transfer attachments (API + DB + storage)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  const digits = freshDigits();
  let admin = '';
  let a: Assistant | undefined;
  let b: Assistant | undefined;
  let sub: SalesMoneySubscriptionView | undefined;
  let salesPayment = '';

  test.beforeAll(async ({ request }) => {
    admin = await tokenOf(USERS.admin.email, USERS.admin.password);
    a = await makeAssistant('atta');
    b = await makeAssistant('attb');
    const student = await trialFamily({ broughtBy: need(a).id, phone: `+${digits}`, name: `جنى${digits.slice(-4)}` });
    const res = await call<SalesMoneySubscriptionView>(request, { token: need(a).token, method: 'POST', path: '/sales/subscriptions', body: { studentId: student, pricing: { tier: 'starter' }, clientRequestId: randomUUID() } });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    sub = res.body;
  });

  test('admin: a bank transfer with two attachments; listed with signed links; refused on cash', async ({ request }) => {
    const s = need(sub);
    const paths = [await adminUpload(request, { admin, subscriptionId: s.id }), await adminUpload(request, { admin, subscriptionId: s.id })];
    const base = { subscriptionId: s.id, amount: 10, currency: s.currency, paidAt: new Date().toISOString() };
    const cash = await call(request, { token: admin, method: 'POST', path: '/payments', body: { ...base, method: 'cash', attachments: paths } });
    expect([cash.status, cash.body['code']]).toEqual([400, 'attachments_not_allowed']);
    const bank = await call<{ id: string }>(request, { token: admin, method: 'POST', path: '/payments', body: { ...base, method: 'bank', attachments: paths } });
    expect(bank.status, JSON.stringify(bank.body)).toBe(201);
    const list = await call<PaymentAttachmentView[]>(request, { token: admin, method: 'GET', path: `/payments/${bank.body.id}/attachments` });
    expect(list.body.map((x) => [x.mime, x.legacy])).toEqual([['image/png', false], ['image/png', false]]);
    const file = await request.fetch(list.body[0]?.url ?? '');
    expect(file.ok()).toBe(true);
  });

  test('sales: a transfer with no receipt at all is recorded (optional since 2026-10-12)', async ({ request }) => {
    const s = need(sub);
    const body = { subscriptionId: s.id, amount: 5, currency: s.currency, paidAt: new Date().toISOString(), clientRequestId: randomUUID() };
    const res = await call<{ id: string }>(request, { token: need(a).token, method: 'POST', path: '/sales/payments', body });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
  });

  test('sales: one attachment; she reads it, another salesperson gets 404', async ({ request }) => {
    const s = need(sub);
    const path = await uploadReceipt(request, { token: need(a).token, subscriptionId: s.id });
    const body = { subscriptionId: s.id, amount: 5, currency: s.currency, paidAt: new Date().toISOString(), attachments: [path], clientRequestId: randomUUID() };
    const res = await call<{ id: string }>(request, { token: need(a).token, method: 'POST', path: '/sales/payments', body });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    salesPayment = res.body.id;
    const mine = await call<PaymentAttachmentView[]>(request, { token: need(a).token, method: 'GET', path: `/sales/me/payments/${salesPayment}/attachments` });
    expect([mine.status, mine.body.length]).toEqual([200, 1]);
    const theirs = await call(request, { token: need(b).token, method: 'GET', path: `/sales/me/payments/${salesPayment}/attachments` });
    expect(theirs.status).toBe(404);
  });

  test('a path outside the package folder is refused', async ({ request }) => {
    const s = need(sub);
    const body = { subscriptionId: s.id, amount: 5, currency: s.currency, paidAt: new Date().toISOString(), attachments: [`${randomUUID()}/x.png`], clientRequestId: randomUUID() };
    const res = await call(request, { token: need(a).token, method: 'POST', path: '/sales/payments', body });
    expect([res.status, res.body['code']]).toEqual([400, 'attachment_path']);
  });
});
