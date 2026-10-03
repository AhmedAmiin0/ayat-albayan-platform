import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PAYOUT_ID, payoutRow } from '../subscriptions/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';

// The rule against double counting (docs/11 §10): the ledger is the record of what was paid.

describe('monthly payouts × per-session ledger', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];
  const order: string[] = [];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    order.length = 0;
    m.earnings.settlePayout.mockImplementation(async () => void order.push('settle'));
    m.payouts.update.mockImplementation(async () => {
      order.push('update');
      return payoutRow({ status: 'paid', paid_at: '2026-10-01T09:00:00Z' });
    });
  });

  it('marking a payout paid first settles what is still outstanding on its lessons, then moves it', async () => {
    m.payouts.get.mockResolvedValue(payoutRow({ status: 'approved' }));
    const res = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: { paidAt: '2026-10-01T09:00:00Z' } });
    expect(res.statusCode).toBe(200);
    expect(order).toEqual(['settle', 'update']);
    expect(m.earnings.settlePayout).toHaveBeenCalledWith({
      payoutId: PAYOUT_ID,
      actorId: 'a0000000-0000-4000-8000-000000000001',
      paidAt: '2026-10-01T09:00:00Z',
    });
  });

  it('a draft or an already paid payout is refused before the ledger is touched', async () => {
    for (const status of ['draft', 'paid'] as const) {
      m.payouts.get.mockResolvedValue(payoutRow({ status }));
      const res = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: {} });
      expect(res.statusCode).toBe(409);
    }
    expect(m.earnings.settlePayout).not.toHaveBeenCalled();
  });

  it('an unknown payout is 404 and does not settle', async () => {
    m.payouts.get.mockResolvedValue(null);
    expect((await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: {} })).statusCode).toBe(404);
    expect(m.earnings.settlePayout).not.toHaveBeenCalled();
  });

  it('a retry after the settle succeeded and the move failed settles again harmlessly (idempotent per payout)', async () => {
    m.payouts.get.mockResolvedValue(payoutRow({ status: 'approved' }));
    m.payouts.update.mockResolvedValueOnce(null);
    expect((await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: {} })).statusCode).toBe(409);
    m.payouts.update.mockResolvedValue(payoutRow({ status: 'paid', paid_at: '2026-10-01T09:00:00Z' }));
    expect((await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: {} })).statusCode).toBe(200);
    expect(m.earnings.settlePayout).toHaveBeenCalledTimes(2);
    expect(m.earnings.settlePayout.mock.calls[0]?.[0]).toMatchObject({ payoutId: PAYOUT_ID });
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
