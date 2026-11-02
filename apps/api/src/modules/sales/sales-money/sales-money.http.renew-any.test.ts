import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { systemResolver } from '../../../common/auth/auth.guard';
import type { PermissionResolver } from '../../../common/auth/permissions';
import { STUDENT_ID, SUB_ID } from '../../finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type InjectArgs, type Mocks } from '../../finance/subscriptions/test-app';
import { CREATE, FAMILY_PHONE, MSG, NONE, PAY, salesDefaults } from './sales-money.fakes';

// «تجديد اشتراك أي طالب» (docs/16 row 38; owner 2026-11-01: «renew to any one without
// checking if it was the creator»). STUDENT_ID is salesA's (salesDefaults): for salesB it is
// another assistant's student.
const OTHER_PHONE = '+966552220000';
const withRenewAny: PermissionResolver = async (user) => [...(await systemResolver(user)), ...(user.role === 'sales' ? ['sales.renew_any' as const] : [])];
const at = (phone?: string) => (phone ? `&phone=${encodeURIComponent(phone)}` : '');
const WRITES = (phone?: string): InjectArgs[] => [
  { method: 'POST', url: '/sales/subscriptions/quote', body: { studentId: STUDENT_ID, pricing: { tier: 'weekly' }, phone } },
  { method: 'POST', url: '/sales/subscriptions', body: { ...CREATE, phone } },
  { method: 'POST', url: '/sales/payments', body: { ...PAY, phone } },
  { method: 'POST', url: '/sales/payments/receipt-upload-url', body: { subscriptionId: SUB_ID, mime: 'image/jpeg', size: 1000, phone } },
  { method: 'POST', url: '/sales/payments/receipt-from-chat', body: { subscriptionId: SUB_ID, messageId: MSG, phone } },
  { method: 'GET', url: `/sales/money/chat-receipts/${MSG}?studentId=${STUDENT_ID}${at(phone)}` },
];
const now = new Date().toISOString();
const chatPhoto = { id: MSG, phone_e164: FAMILY_PHONE, direction: 'inbound', media_id: 'm', media_mime: 'image/jpeg', media_path: null, body: null, created_at: now, line: 'chat', interactive_payload: { type: 'image' } };

function suite(resolver: PermissionResolver) {
  const ctx = {} as { app: NestFastifyApplication; m: Mocks; call: Awaited<ReturnType<typeof moneyApp>>['call'] };
  beforeAll(async () => Object.assign(ctx, await moneyApp(resolver)));
  afterAll(() => ctx.app.close());
  beforeEach(() => {
    resetMocks(ctx.m);
    salesDefaults(ctx.m);
    ctx.m.storage.signedUpload.mockResolvedValue({ bucket: 'receipts', path: `${SUB_ID}/x.jpg`, token: 't' });
    ctx.m.mediaQueries.message.mockResolvedValue(chatPhoto);
    ctx.m.media.cache.mockResolvedValue({ bucket: 'wa-media', path: `${MSG}.jpg`, mime: 'image/jpeg' });
    ctx.m.storage.info.mockResolvedValue({ size: 2000, contentType: 'image/jpeg' });
    ctx.m.storage.signedDownload.mockResolvedValue({ url: 'https://storage.test/x', expires_at: now });
  });
  return ctx;
}

type Ctx = ReturnType<typeof suite>;
const statuses = async (ctx: Ctx, routes: InjectArgs[]) => {
  const out: number[] = [];
  for (const r of routes) out.push((await ctx.call({ ...r, token: 'salesB' })).statusCode);
  return out;
};
const ALL_PASS = [200, 201, 201, 200, 200, 200];

const refused = async (ctx: Ctx, routes: InjectArgs[]) => {
  for (const r of routes) {
    const res = await ctx.call({ ...r, token: 'salesB' });
    expect([r.url, res.statusCode, res.json().code]).toEqual([r.url, 403, 'not_your_student']);
  }
  expect(ctx.m.subs.insert).not.toHaveBeenCalled();
  expect(ctx.m.payments.insert).not.toHaveBeenCalled();
  expect(ctx.m.storage.signedUpload).not.toHaveBeenCalled();
  expect(ctx.m.storage.copy).not.toHaveBeenCalled();
  expect(ctx.m.mediaQueries.message).not.toHaveBeenCalled();
};

describe('without sales.renew_any (the system sales role): unchanged, hers only', () => {
  const ctx = suite(systemResolver);

  it('another assistant’s student stays 403 on every write, even with the family’s phone', async () => {
    await refused(ctx, WRITES(FAMILY_PHONE));
    expect(ctx.m.family.phonesOf).not.toHaveBeenCalled();
  });

  it('a student nobody owns (brought_by null, no lead) stays 403 too', async () => {
    ctx.m.sales.ownership.mockResolvedValue(NONE);
    await refused(ctx, WRITES(FAMILY_PHONE));
  });
});

describe('with sales.renew_any: ANY student, no owner / creator / family-chat check', () => {
  const ctx = suite(withRenewAny);

  it('another assistant’s student: quote, renewal, transfer, upload, chat receipt and its thumbnail', async () => {
    expect(await statuses(ctx, WRITES(FAMILY_PHONE))).toEqual(ALL_PASS);
    // Recorded as her; the commission still follows students.brought_by (row 38a).
    const present = expect.anything();
    for (const insert of [ctx.m.subs.insert, ctx.m.payments.insert]) {
      expect(insert).toHaveBeenCalledWith(expect.not.objectContaining({ phone: present }));
      expect(insert).toHaveBeenCalledWith(expect.not.objectContaining({ brought_by: present }));
    }
    expect(ctx.m.sales.ownership).not.toHaveBeenCalled();
  });

  it('a student nobody owns (brought_by null), with no chat phone at all', async () => {
    ctx.m.sales.ownership.mockResolvedValue(NONE);
    expect(await statuses(ctx, WRITES())).toEqual(ALL_PASS);
    expect(ctx.m.family.phonesOf).not.toHaveBeenCalled();
  });

  it('a phone that is not the student’s family (another chat): still passes', async () => {
    expect(await statuses(ctx, WRITES(OTHER_PHONE))).toEqual(ALL_PASS);
  });

  it('the chat files stay that student’s own family chat: the phone when it is one of its numbers, else the main one', async () => {
    ctx.m.mediaQueries.receipts.mockResolvedValue([]);
    const list = (phone: string) => ({ method: 'GET' as const, url: `/sales/money/chat-receipts?studentId=${STUDENT_ID}${at(phone)}`, token: 'salesB' as const });
    expect((await ctx.call(list(OTHER_PHONE))).statusCode).toBe(200);
    const read = ctx.m.mediaQueries.receipts;
    expect(read).toHaveBeenLastCalledWith(expect.objectContaining({ phone: FAMILY_PHONE }));
    expect(ctx.m.family.familyPhone).toHaveBeenCalledWith(STUDENT_ID);
    // A second number of the family: its own chat.
    ctx.m.family.phonesOf.mockResolvedValue([FAMILY_PHONE, OTHER_PHONE]);
    expect((await ctx.call(list(OTHER_PHONE))).statusCode).toBe(200);
    expect(read).toHaveBeenLastCalledWith(expect.objectContaining({ phone: OTHER_PHONE }));
  });

  it('«إلغاء الباقة» is not widened: an un-owned student’s package stays 403', async () => {
    const res = await ctx.call({ method: 'POST', url: `/sales/subscriptions/${SUB_ID}/cancel`, token: 'salesB', body: {} });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
  });
});
