import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { manualRefundKey } from './refund/stop-refund.plan';
import { ADMIN, bankRow, REQ, STUDENT, stopApp, SUB } from './course-stop.fakes';

// «إلغاء مع استرداد» over HTTP (owner 2026-11-02): bank-only packages, the key, the cap.
// 400 SAR / 8 lessons, 3 attended, rate 100 %, 290 paid by bank → 140 refundable.
type App = Awaited<ReturnType<typeof stopApp>>;
const URL = `/students/${STUDENT}/course-stop`;
const BODY = { subscriptionId: SUB, reason: 'سفر الأسرة', clientRequestId: REQ };
const withRefund = (amount: number) => ({ ...BODY, refund: { amount } });

describe('POST /students/:id/course-stop with a refund (manual payments)', () => {
  let t: App;
  beforeAll(async () => {
    t = await stopApp();
  }, 60_000);
  afterAll(() => t.app.close());
  beforeEach(() => t.reset());

  it('the admin: the stop, then ONE refund row (same method, the stop key) and the bell', async () => {
    const res = await t.call({ method: 'POST', url: URL, token: 'admin', body: withRefund(140) });
    expect(res.statusCode).toBe(201);
    expect(res.json().refund).toEqual({ amount: 140, card: 0, manual: 140 });
    expect(t.m.repo.stop).toHaveBeenCalledTimes(1);
    expect(t.m.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: SUB,
        amount: 140,
        currency: 'SAR',
        kind: 'refund',
        method: 'bank',
        clientRequestId: manualRefundKey(REQ),
      }),
      ADMIN,
    );
    expect(t.m.push.notifyAdmins).toHaveBeenCalledWith(
      'payment_due',
      expect.objectContaining({ subject: `course_stop_refund:${REQ}`, bellOnly: true }),
    );
    expect(t.m.clients.client).not.toHaveBeenCalled();
  });

  it('the person may lower it; the method follows the newest manual payment', async () => {
    t.m.refunds.money.mockResolvedValue([
      bankRow(),
      bankRow({ id: 'p2', amount: 10, method: 'wallet' }),
    ]);
    const res = await t.call({ method: 'POST', url: URL, token: 'admin', body: withRefund(100) });
    expect(res.json().refund).toEqual({ amount: 100, card: 0, manual: 100 });
    expect(t.m.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100, method: 'wallet' }),
      ADMIN,
    );
  });

  it('above the net paid (the allowed maximum): 409, nothing stopped or refunded', async () => {
    const res = await t.call({
      method: 'POST',
      url: URL,
      token: 'admin',
      body: withRefund(290.01),
    });
    expect([res.statusCode, res.json().code]).toEqual([409, 'refund_exceeds_allowed']);
    expect(t.m.repo.stop).not.toHaveBeenCalled();
    expect(t.m.payments.create).not.toHaveBeenCalled();
  });

  it('every lesson attended: «unattended» refunds 0 and the course owes what stays paid', async () => {
    t.m.refunds.pkg.mockResolvedValue({
      price: 400,
      lessonsTotal: 8,
      attended: 8,
      studentName: 'ط',
    });
    const body = { ...BODY, refund: { choice: 'unattended' } };
    const res = await t.call({ method: 'POST', url: URL, token: 'admin', body });
    expect([res.statusCode, res.json().refund]).toEqual([201, { amount: 0, card: 0, manual: 0 }]);
    expect(t.m.repo.stop).toHaveBeenCalledWith(
      expect.objectContaining({ owed: { amount: 290, choice: 'refund_unattended' } }),
    );
    expect(t.m.payments.create).not.toHaveBeenCalled();
  });

  it('sales without subscriptions.refund: 403 refund_not_allowed before the stop', async () => {
    const res = await t.call({ method: 'POST', url: URL, token: 'sales', body: withRefund(50) });
    expect([res.statusCode, res.json().code]).toEqual([403, 'refund_not_allowed']);
    expect(t.m.repo.stop).not.toHaveBeenCalled();
  });

  it('«إلغاء فقط» (no refund) never reads or writes payments', async () => {
    const res = await t.call({ method: 'POST', url: URL, token: 'admin', body: BODY });
    expect([res.statusCode, res.json().refund]).toEqual([201, null]);
    expect(t.m.refunds.money).not.toHaveBeenCalled();
    expect(t.m.payments.create).not.toHaveBeenCalled();
  });

  it('a replay: its own refund row is left out of «paid», the same row is asked again', async () => {
    const own = bankRow({
      id: 'r1',
      kind: 'refund',
      amount: 140,
      client_request_id: manualRefundKey(REQ),
    });
    t.m.refunds.money.mockResolvedValue([bankRow(), own]);
    t.m.repo.stop.mockResolvedValue({ ...(await t.m.repo.stop()), replayed: true });
    const res = await t.call({ method: 'POST', url: URL, token: 'admin', body: withRefund(140) });
    expect(res.json().refund).toEqual({ amount: 140, card: 0, manual: 140 });
    expect(t.m.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({ clientRequestId: manualRefundKey(REQ) }),
      ADMIN,
    );
  });
});
