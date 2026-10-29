import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { systemResolver } from '../../../common/auth/auth.guard';
import type { PermissionResolver } from '../../../common/auth/permissions';
import { STUDENT_ID, SUB_ID } from '../../finance/subscriptions/money/money.fakes';
import { moneyApp, resetMocks, type InjectArgs, type Mocks } from '../../finance/subscriptions/test-app';
import { CREATE, FAMILY_PHONE, PAY, salesDefaults } from './sales-money.fakes';

// «تجديد اشتراك أي طالب من المحادثة» (owner 2026-10-29, docs/16 row 38): salesB owns nothing (an imported family).
const OTHER_PHONE = '+966552220000';
const withRenewAny: PermissionResolver = async (user) => [...(await systemResolver(user)), ...(user.role === 'sales' ? ['sales.renew_any' as const] : [])];
const WRITES = (phone?: string): InjectArgs[] => [
  { method: 'POST', url: '/sales/subscriptions/quote', body: { studentId: STUDENT_ID, pricing: { tier: 'weekly' }, phone } },
  { method: 'POST', url: '/sales/subscriptions', body: { ...CREATE, phone } },
  { method: 'POST', url: '/sales/payments', body: { ...PAY, phone } },
  { method: 'POST', url: '/sales/payments/receipt-upload-url', body: { subscriptionId: SUB_ID, mime: 'image/jpeg', size: 1000, phone } },
];

function suite(resolver: PermissionResolver) {
  const ctx = {} as { app: NestFastifyApplication; m: Mocks; call: Awaited<ReturnType<typeof moneyApp>>['call'] };
  beforeAll(async () => Object.assign(ctx, await moneyApp(resolver)));
  afterAll(() => ctx.app.close());
  beforeEach(() => {
    resetMocks(ctx.m);
    salesDefaults(ctx.m);
    ctx.m.family.phoneOf.mockResolvedValue(FAMILY_PHONE);
    ctx.m.storage.signedUpload.mockResolvedValue({ bucket: 'receipts', path: `${SUB_ID}/x.jpg`, token: 't' });
  });
  return ctx;
}

const refused = async (ctx: ReturnType<typeof suite>, routes: InjectArgs[]) => {
  for (const r of routes) {
    const res = await ctx.call({ ...r, token: 'salesB' });
    expect([r.url, res.statusCode, res.json().code]).toEqual([r.url, 403, 'not_your_student']);
  }
  expect(ctx.m.subs.insert).not.toHaveBeenCalled();
  expect(ctx.m.payments.insert).not.toHaveBeenCalled();
  expect(ctx.m.storage.signedUpload).not.toHaveBeenCalled();
};

describe('without sales.renew_any (the system sales role): unchanged, the chat phone opens nothing', () => {
  const ctx = suite(systemResolver);

  it('every write for a student she does not own stays 403, even with the family’s phone', async () => {
    await refused(ctx, WRITES(FAMILY_PHONE));
    expect(ctx.m.family.phoneOf).not.toHaveBeenCalled();
  });
});

describe('with sales.renew_any: any student of the chat’s family', () => {
  const ctx = suite(withRenewAny);

  it('subscribe / renew and the bank transfer of an un-owned student of this chat’s family go through, as her', async () => {
    const [quote, create, pay, upload] = WRITES(FAMILY_PHONE);
    expect((await ctx.call({ ...quote, token: 'salesB' } as InjectArgs)).statusCode).toBe(200);
    expect((await ctx.call({ ...create, token: 'salesB' } as InjectArgs)).statusCode).toBe(201);
    expect(ctx.m.subs.insert).toHaveBeenCalledWith(expect.not.objectContaining({ phone: expect.anything() }));
    expect((await ctx.call({ ...pay, token: 'salesB' } as InjectArgs)).statusCode).toBe(201);
    expect(ctx.m.payments.insert).toHaveBeenCalledWith(expect.not.objectContaining({ phone: expect.anything() }));
    expect((await ctx.call({ ...upload, token: 'salesB' } as InjectArgs)).statusCode).toBe(200);
    expect(ctx.m.family.phoneOf).toHaveBeenCalledWith(STUDENT_ID);
  });

  it('another family’s student (its phone is not this chat’s) → 403 not_your_student, nothing written', async () => {
    ctx.m.family.phoneOf.mockResolvedValue(OTHER_PHONE);
    await refused(ctx, WRITES(FAMILY_PHONE));
  });

  it('no chat phone, or a student with no family phone → 403 as before', async () => {
    await refused(ctx, WRITES());
    ctx.m.family.phoneOf.mockResolvedValue(null);
    await refused(ctx, WRITES(FAMILY_PHONE));
  });

  it('the receipts of the chat: only that student’s own family chat (its phone), as before', async () => {
    ctx.m.mediaQueries.recent.mockResolvedValue([]);
    const res = await ctx.call({ method: 'GET', url: `/sales/money/chat-receipts?studentId=${STUDENT_ID}&phone=%2B966551110000`, token: 'salesB' });
    expect(res.statusCode).toBe(200);
    expect(ctx.m.mediaQueries.recent).toHaveBeenCalledWith(expect.objectContaining({ phone: FAMILY_PHONE }));
  });

  it('«إلغاء الباقة» is not widened: an un-owned student’s package stays 403', async () => {
    const res = await ctx.call({ method: 'POST', url: `/sales/subscriptions/${SUB_ID}/cancel`, token: 'salesB', body: {} });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_student']);
  });
});
