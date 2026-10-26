import { beforeEach, describe, expect, it, vi } from 'vitest';
import { conflict } from '../../../common/http/errors';
import { ACTOR, earning, eid, OTHER_TEACHER, PAYMENT, paymentRow, REQUEST, TEACHER } from './earnings.fakes';
import { EarningsService } from './earnings.service';

const queries = {
  teacher: vi.fn(), money: vi.fn(), sessions: vi.fn(), forPayment: vi.fn(), payments: vi.fn(),
  payment: vi.fn(), byRequest: vi.fn(), record: vi.fn(),
};
const receipts = { check: vi.fn(), uploadUrl: vi.fn(), download: vi.fn() };
const service = () => new EarningsService(queries as never, receipts as never);
const ctx = { teacherId: TEACHER, actorId: ACTOR };
const base = { amount: 100, method: 'bank' as const, paidAt: '2026-10-01T09:00:00Z' };
const code = (p: Promise<unknown>) => p.then(() => 'ok', (e: { response?: { code?: string } }) => e.response?.code);

beforeEach(() => {
  for (const fn of [...Object.values(queries), ...Object.values(receipts)]) fn.mockReset();
  queries.teacher.mockResolvedValue({ id: TEACHER, display_name_ar: 'أبرار' });
  queries.byRequest.mockResolvedValue(null);
  queries.payment.mockResolvedValue(paymentRow());
  queries.record.mockResolvedValue({ payment_id: PAYMENT, replayed: false });
  queries.forPayment.mockResolvedValue([earning(2), earning(1), earning(3, { paid_amount: 20, status: 'partially_paid' })]);
});

describe('EarningsService.record: allocation', () => {
  it('spreads the amount over the unpaid sessions oldest first and sends the plan to the RPC', async () => {
    const res = await service().record(ctx, { ...base, amount: 100 });
    expect(queries.forPayment).toHaveBeenCalledWith(TEACHER, undefined);
    expect(queries.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: ACTOR,
        teacher_id: TEACHER,
        amount: 100,
        items: [{ earning_id: eid(1), amount: 70 }, { earning_id: eid(2), amount: 30 }],
      }),
    );
    expect(res).toMatchObject({ replayed: false, payment: { id: PAYMENT, amount: 100, sessions: 2 } });
  });

  it('a partial amount is fine: the newest session is left untouched', async () => {
    await service().record(ctx, { ...base, amount: 20 });
    expect(queries.record).toHaveBeenCalledWith(expect.objectContaining({ items: [{ earning_id: eid(1), amount: 20 }] }));
  });

  it('the exact outstanding total pays every session', async () => {
    await service().record(ctx, { ...base, amount: 70 + 70 + 50 });
    const [arg] = queries.record.mock.calls[0] as [{ items: unknown[] }];
    expect(arg.items).toHaveLength(3);
  });

  it('refuses more than the chosen sessions owe: 409 overpayment, nothing written', async () => {
    expect(await code(service().record(ctx, { ...base, amount: 190.01 }))).toBe('overpayment');
    expect(queries.record).not.toHaveBeenCalled();
  });

  it('refuses when nothing is outstanding', async () => {
    queries.forPayment.mockResolvedValue([earning(1, { paid_amount: 70, status: 'paid' })]);
    expect(await code(service().record(ctx, base))).toBe('nothing_outstanding');
    queries.forPayment.mockResolvedValue([]);
    expect(await code(service().record(ctx, base))).toBe('nothing_outstanding');
  });

  it('ticked sessions: only those; a repeated or foreign id is 404 earning_not_found', async () => {
    queries.forPayment.mockResolvedValue([earning(2)]);
    await service().record(ctx, { ...base, amount: 70, earningIds: [eid(2), eid(2)] });
    expect(queries.forPayment).toHaveBeenCalledWith(TEACHER, [eid(2)]);
    queries.forPayment.mockResolvedValue([]);
    expect(await code(service().record(ctx, { ...base, earningIds: [eid(9)] }))).toBe('earning_not_found');
  });

  it('a race lost in the database (overpayment raised by the RPC) stays a 409', async () => {
    queries.record.mockRejectedValue(conflict('overpayment')); // what ledgerError makes of the RPC's raise (earnings.queries.test)
    expect(await code(service().record(ctx, base))).toBe('overpayment');
  });
});

describe('EarningsService.record: receipt, teacher, idempotency', () => {
  it('checks the receipt path against the teacher folder before writing', async () => {
    receipts.check.mockRejectedValue(Object.assign(new Error('x'), { response: { code: 'receipt_path' } }));
    expect(await code(service().record(ctx, { ...base, receiptPath: `${OTHER_TEACHER}/a.png` }))).toBe('receipt_path');
    expect(receipts.check).toHaveBeenCalledWith(TEACHER, `${OTHER_TEACHER}/a.png`);
    expect(queries.record).not.toHaveBeenCalled();
  });

  it('unknown teacher → 404 teacher_not_found', async () => {
    queries.teacher.mockResolvedValue(null);
    expect(await code(service().record(ctx, base))).toBe('teacher_not_found');
  });

  it('a retry of the same clientRequestId returns the recorded payment and writes nothing', async () => {
    queries.byRequest.mockResolvedValue(paymentRow({ client_request_id: REQUEST }));
    const res = await service().record(ctx, { ...base, clientRequestId: REQUEST });
    expect(res).toMatchObject({ replayed: true, payment: { id: PAYMENT } });
    expect(queries.record).not.toHaveBeenCalled();
    expect(queries.forPayment).not.toHaveBeenCalled();
  });

  it('a clientRequestId already used for another teacher is 409 request_reused', async () => {
    queries.byRequest.mockResolvedValue(paymentRow({ teacher_id: OTHER_TEACHER }));
    expect(await code(service().record(ctx, { ...base, clientRequestId: REQUEST }))).toBe('request_reused');
  });

  it('the RPC saying replayed (two retries at once) is passed through', async () => {
    queries.record.mockResolvedValue({ payment_id: PAYMENT, replayed: true });
    expect((await service().record(ctx, { ...base, clientRequestId: REQUEST })).replayed).toBe(true);
  });
});

describe('EarningsService: reads', () => {
  it('balance: earned, paid, outstanding for the teacher', async () => {
    queries.money.mockResolvedValue([earning(1, { paid_amount: 70 }), earning(2, { paid_amount: 10 })]);
    expect(await service().balance(TEACHER)).toMatchObject({
      earned: 140, paid: 80, outstanding: 60, overpaid: 0, currency: 'EGP', teacher: { display_name_ar: 'أبرار' },
    });
    queries.teacher.mockResolvedValue(null);
    expect(await code(service().balance(TEACHER))).toBe('teacher_not_found');
  });

  it('receipt: a teacher gets only their own payment’s receipt', async () => {
    receipts.download.mockResolvedValue({ url: 'u', expires_at: 'e' });
    queries.payment.mockResolvedValue(paymentRow({ receipt_path: `${TEACHER}/a.png` }));
    expect(await service().receipt(PAYMENT, TEACHER)).toEqual({ url: 'u', expires_at: 'e' });
    expect(await code(service().receipt(PAYMENT, OTHER_TEACHER))).toBe('payment_not_found');
    queries.payment.mockResolvedValue(null);
    expect(await code(service().receipt(PAYMENT))).toBe('payment_not_found');
  });
});
