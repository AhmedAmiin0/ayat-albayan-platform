import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import type { MyPaymentRow, SalesChatReceipt, SalesMoneySubscriptionView, SalesPaymentView, SalesQuoteView } from '@ab/shared';
import { call, makeAssistant, type Assistant } from '../../support/sales/assistant-api';
import { stubInboundMedia } from '../../support/messaging/inbox';
import { freshDigits } from '../../support/core/messages';
import { PNG, statusFacts, trialFamily, uploadReceipt } from '../../support/sales/sales-money';
import { withSql } from '../../support/core/schedule';
import { stubReset } from '../../support/core/wa-stub';

// Owner 2026-10-12 «how can assistants move student from trial to subscribed», through the REAL API and
// database (wa-stub for WhatsApp): A subscribes her trial student from the chat, records the family's bank
// transfer with a receipt (uploaded, then one picked from the chat), the student is «مشترك» at once and
// the payments show in her «مدفوعاتي». B (another salesperson) is 403 on all of it.

const need = <T>(v: T | undefined): T => {
  if (v === undefined) throw new Error('an earlier step did not run');
  return v;
};
const today = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);

test.describe.serial('sales subscribe from the chat with a bank-transfer receipt (API + DB)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  const digits = freshDigits();
  const phone = `+${digits}`;
  let a: Assistant | undefined;
  let b: Assistant | undefined;
  let student = '';
  let sub: SalesMoneySubscriptionView | undefined;
  const paid: string[] = [];

  test.beforeAll(async () => {
    await stubReset();
    a = await makeAssistant('subsa');
    b = await makeAssistant('subsb');
    student = await trialFamily({ broughtBy: need(a).id, phone, name: `سلمى${digits.slice(-3)}` });
  });

  test('B: 403 not_your_student on the quote and the create; her family view is empty', async ({ request }) => {
    const token = need(b).token;
    const quote = await call(request, { token, method: 'POST', path: '/sales/subscriptions/quote', body: { studentId: student, pricing: { tier: 'starter' } } });
    const create = await call(request, { token, method: 'POST', path: '/sales/subscriptions', body: { studentId: student, pricing: { tier: 'starter' }, startsOn: today(), clientRequestId: randomUUID() } });
    expect([quote.status, quote.body['code'], create.status, create.body['code']]).toEqual([403, 'not_your_student', 403, 'not_your_student']);
    const fam = await call(request, { token, method: 'GET', path: `/sales/money/family?phone=${encodeURIComponent(phone)}` });
    expect(fam.body).toEqual({ students: [] });
  });

  test('A: sees the price, creates the package (a double click replays it), her family view offers it', async ({ request }) => {
    const token = need(a).token;
    const quote = await call<SalesQuoteView>(request, { token, method: 'POST', path: '/sales/subscriptions/quote', body: { studentId: student, pricing: { tier: 'starter' } } });
    expect(quote.status).toBe(200);
    expect(quote.body.currency).toBe('SAR');
    const body = { studentId: student, pricing: { tier: 'starter' }, startsOn: today(), clientRequestId: randomUUID() };
    const first = await call<SalesMoneySubscriptionView>(request, { token, method: 'POST', path: '/sales/subscriptions', body });
    const again = await call<SalesMoneySubscriptionView>(request, { token, method: 'POST', path: '/sales/subscriptions', body });
    expect([first.status, again.body.id]).toEqual([201, first.body.id]);
    expect(first.body).toMatchObject({ price: quote.body.afterDiscount, paid: 0, due: quote.body.afterDiscount, status: 'unpaid' });
    sub = first.body;
    const fam = await call<{ students: { id: string; open: { id: string }[] }[] }>(request, { token, method: 'GET', path: `/sales/money/family?phone=${encodeURIComponent(phone)}` });
    expect(fam.body.students.map((s) => [s.id, s.open.map((o) => o.id)])).toEqual([[student, [sub.id]]]);
  });

  test('A: a partial transfer with an uploaded receipt counts at once: the trial student is «مشترك», audited as hers', async ({ request }) => {
    const me = need(a);
    const s = need(sub);
    const receiptPath = await uploadReceipt(request, { token: me.token, subscriptionId: s.id });
    const half = Math.round(s.price * 40) / 100;
    const body = { subscriptionId: s.id, amount: half, currency: s.currency, paidAt: new Date().toISOString(), receiptPath, clientRequestId: randomUUID() };
    const res = await call<SalesPaymentView>(request, { token: me.token, method: 'POST', path: '/sales/payments', body });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body).toMatchObject({ method: 'bank', kind: 'payment', student: { id: student, status: 'active' } });
    paid.push(res.body.id);
    expect(await statusFacts(student, me.id)).toEqual({ status: 'active', audited: true });
    const [row] = await withSql((sql) => sql<{ recorded_by: string; receipt_path: string }[]>`select recorded_by, receipt_path from public.payments where id = ${res.body.id}`);
    expect(row).toEqual({ recorded_by: me.id, receipt_path: receiptPath });
  });

  test('A: the rest with the receipt the family sent in the chat; B cannot list, copy or pay', async ({ request }) => {
    const me = need(a);
    const s = need(sub);
    expect((await stubInboundMedia({ from: digits, media: { kind: 'image', mime: 'image/png', caption: 'إيصال', base64: PNG.toString('base64') } })).status).toBe(200);
    const listPath = `/sales/money/chat-receipts?studentId=${student}`;
    await expect.poll(async () => (await call<SalesChatReceipt[]>(request, { token: me.token, method: 'GET', path: listPath })).body.length).toBe(1);
    const [item] = (await call<SalesChatReceipt[]>(request, { token: me.token, method: 'GET', path: listPath })).body;
    const copyBody = { subscriptionId: s.id, messageId: need(item).message_id };
    expect((await call(request, { token: need(b).token, method: 'GET', path: listPath })).status).toBe(403);
    expect((await call(request, { token: need(b).token, method: 'POST', path: '/sales/payments/receipt-from-chat', body: copyBody })).status).toBe(403);
    const copied = await call<{ receipt_path: string }>(request, { token: me.token, method: 'POST', path: '/sales/payments/receipt-from-chat', body: copyBody });
    expect(copied.status, JSON.stringify(copied.body)).toBe(200);
    const rest = Math.round((s.price - Math.round(s.price * 40) / 100) * 100) / 100;
    const body = { subscriptionId: s.id, amount: rest, currency: s.currency, paidAt: new Date().toISOString(), receiptPath: copied.body.receipt_path, clientRequestId: randomUUID() };
    expect((await call(request, { token: need(b).token, method: 'POST', path: '/sales/payments', body })).status).toBe(403);
    const res = await call<SalesPaymentView>(request, { token: me.token, method: 'POST', path: '/sales/payments', body });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    paid.push(res.body.id);
    const [pkg] = await withSql((sql) => sql<{ status: string }[]>`select status from public.subscriptions where id = ${s.id}`);
    expect(pkg?.status).toBe('active');
  });

  test('«مدفوعاتي»: both transfers are A’s; none is B’s', async ({ request }) => {
    const mine = await call<MyPaymentRow[]>(request, { token: need(a).token, method: 'GET', path: '/sales/me/payments' });
    expect(mine.body.map((p) => p.id).sort()).toEqual([...paid].sort());
    expect(mine.body.every((p) => p.method === 'bank' && p.kind === 'payment')).toBe(true);
    const theirs = await call<MyPaymentRow[]>(request, { token: need(b).token, method: 'GET', path: '/sales/me/payments' });
    expect(theirs.body).toEqual([]);
  });
});
