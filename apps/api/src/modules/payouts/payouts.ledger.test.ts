import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PAYOUT_ID, payoutRow, TEACHER_ID } from '../subscriptions/money/money.fakes';
import { ADMIN, moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';

// The rule against double counting (docs/11 §12): the ledger is the record of what was paid, and
// marking a payout paid settles it in the SAME transaction (pay_payout, migration 20261005000201).

describe('monthly payouts × per-session ledger', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.payouts.get.mockResolvedValueOnce(payoutRow({ status: 'approved' }));
    m.payouts.get.mockResolvedValue(payoutRow({ status: 'paid', paid_at: '2026-10-01T09:00:00Z', method: 'bank' }));
  });

  it('«تم الدفع» is one RPC: settlement + status, with the transfer details', async () => {
    const body = { paidAt: '2026-10-01T09:00:00Z', method: 'bank', note: 'تحويل', receiptPath: `${TEACHER_ID}/r.jpg` };
    m.storage.exists.mockResolvedValue(true);
    const res = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'paid', method: 'bank' });
    expect(m.corrections.payPayout).toHaveBeenCalledWith({
      payoutId: PAYOUT_ID,
      actorId: ADMIN.id,
      paidAt: '2026-10-01T09:00:00Z',
      method: 'bank',
      note: 'تحويل',
      receiptPath: `${TEACHER_ID}/r.jpg`,
    });
    expect(m.payouts.update).not.toHaveBeenCalled();
  });

  it('a receipt outside the teacher folder is 400 receipt_path, before any money moves', async () => {
    const res = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: { receiptPath: 'other/r.jpg' } });
    expect(res.json().code).toBe('receipt_path');
    expect(m.corrections.payPayout).not.toHaveBeenCalled();
  });

  it('a draft or an already paid payout is refused before the ledger is touched; unknown is 404', async () => {
    for (const status of ['draft', 'paid'] as const) {
      m.payouts.get.mockReset().mockResolvedValue(payoutRow({ status }));
      expect((await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: {} })).statusCode).toBe(409);
    }
    m.payouts.get.mockReset().mockResolvedValue(null);
    expect((await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: {} })).statusCode).toBe(404);
    expect(m.corrections.payPayout).not.toHaveBeenCalled();
  });

  it('an open payout shows ledger_paid (what per-session payments already covered); a paid one does not', async () => {
    m.earnings.paidOnLessons.mockResolvedValue(40);
    m.payouts.forMonth.mockResolvedValue([payoutRow(), payoutRow({ status: 'paid', id: 'x', paid_at: '2026-10-01T09:00:00Z' })]);
    const [open, paid] = (await call({ method: 'GET', url: '/payouts?month=2026-09' })).json();
    expect(open).toMatchObject({ amount: 140, ledger_paid: 40 });
    expect(paid.ledger_paid).toBeUndefined();
    expect(m.earnings.paidOnLessons).toHaveBeenCalledTimes(1);
  });

  it('a teacher’s own payouts carry ledger_paid too', async () => {
    m.teachers.idByProfile.mockResolvedValue('5e000000-0000-4000-8000-000000000001');
    m.payouts.forTeacher.mockResolvedValue([payoutRow({ status: 'approved' })]);
    m.earnings.paidOnLessons.mockResolvedValue(70);
    const res = await call({ method: 'GET', url: '/teachers/me/payouts', token: 'teacher' });
    expect(res.json()[0]).toMatchObject({ status: 'approved', ledger_paid: 70 });
  });
});
