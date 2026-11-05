import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PushService } from '@/common/push/push.service';
import { PAYMENT_ID, paymentRow, STUDENT_ID, SUB_ID } from '@/modules/finance/subscriptions/money/money.fakes';
import { ADMIN, moneyApp, resetMocks, SALES_A, type Mocks } from '@/modules/finance/subscriptions/test-app';
import { PAY, salesDefaults } from '@/modules/sales/sales-money/sales-money.fakes';

const BODY = { subscriptionId: SUB_ID, amount: 145, currency: 'SAR', method: 'bank', paidAt: '2026-10-01T09:00:00Z' };
const OTHER_ADMIN = 'a0000000-0000-4000-8000-000000000002';

describe('every recorded payment → «تم استلام دفعة», after the response', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];
  const push = { notifyProfiles: vi.fn(), notifyAdmins: vi.fn(), notifySales: vi.fn() };
  const told = () => push.notifyProfiles.mock.calls.map(([e]) => e as { kind: string; profileIds: string[] });

  beforeAll(async () => ({ app, m, call } = await moneyApp(undefined, (b) => b.overrideProvider(PushService).useValue(push))));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    push.notifyProfiles.mockReset().mockResolvedValue(undefined);
    m.received.adminIds.mockResolvedValue([ADMIN.id, OTHER_ADMIN]);
    m.received.ownerIds.mockResolvedValue([SALES_A.id]);
    m.payments.subscription.mockResolvedValue({ id: SUB_ID, student_id: STUDENT_ID, currency: 'SAR', status: 'unpaid', cancel_kind: null });
    m.payments.insert.mockResolvedValue(paymentRow());
    m.payments.get.mockResolvedValue(paymentRow());
    m.storage.exists.mockResolvedValue(true);
  });

  it('the admin records a payment: the other admins and the student’s assistant, not the admin', async () => {
    expect((await call({ method: 'POST', url: '/payments', body: BODY })).statusCode).toBe(201);
    await vi.waitFor(() => expect(push.notifyProfiles).toHaveBeenCalled());
    expect(m.received.ownerIds).toHaveBeenCalledWith(STUDENT_ID);
    expect(push.notifyProfiles).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'payment_received',
      profileIds: [OTHER_ADMIN, SALES_A.id],
      subject: `payment:${PAYMENT_ID}`,
      vars: { student: 'سهيلة', amount: 145, currency: 'SAR' },
      data: { studentId: STUDENT_ID },
    }));
  });

  it('the assistant’s bank transfer from the chat: every admin, not her', async () => {
    salesDefaults(m);
    const res = await call({ method: 'POST', url: '/sales/payments', token: 'salesA', body: PAY });
    expect(res.statusCode).toBe(201);
    await vi.waitFor(() => expect(push.notifyProfiles).toHaveBeenCalled());
    expect(told()).toEqual([expect.objectContaining({ kind: 'payment_received', profileIds: [ADMIN.id, OTHER_ADMIN] })]);
  });

  it('a refund, or a replay of a payment already recorded, tells nobody', async () => {
    m.payments.netPaid.mockResolvedValue(145);
    m.payments.insert.mockResolvedValue(paymentRow({ kind: 'refund' }));
    expect((await call({ method: 'POST', url: '/payments', body: { ...BODY, kind: 'refund' } })).statusCode).toBe(201);
    m.payments.byRequest.mockResolvedValue({ id: PAYMENT_ID });
    const replay = { ...BODY, clientRequestId: '0f0e0d0c-0000-4000-8000-0000000000aa' };
    expect((await call({ method: 'POST', url: '/payments', body: replay })).statusCode).toBe(201);
    await new Promise((r) => setTimeout(r, 10));
    expect(m.received.adminIds).not.toHaveBeenCalled();
    expect(push.notifyProfiles).not.toHaveBeenCalled();
  });

  it('never on the request path: a push that hangs or fails does not hold or fail the response', async () => {
    push.notifyProfiles.mockReturnValue(new Promise(() => undefined));
    expect((await call({ method: 'POST', url: '/payments', body: BODY })).statusCode).toBe(201);
    m.received.adminIds.mockRejectedValue(new Error('db down'));
    expect((await call({ method: 'POST', url: '/payments', body: BODY })).statusCode).toBe(201);
  });
});
