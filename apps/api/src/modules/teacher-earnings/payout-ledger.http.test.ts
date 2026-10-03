import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PAYOUT_ID, payoutRow } from '../subscriptions/money.fakes';
import { moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';
import { PAYMENT } from './earnings.fakes';

// The monthly statement and the per-session ledger never double count (docs/11 §8b): paying a
// month settles exactly its still-outstanding sessions in the ledger; approving touches nothing.
describe('paying a monthly payout settles the per-session ledger', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => {
    resetMocks(m);
    m.payouts.get.mockResolvedValue(payoutRow({ status: 'approved', approved_at: '2026-10-01T00:00:00Z' }));
    m.payouts.update.mockResolvedValue(payoutRow({ status: 'paid', paid_at: '2026-10-02T00:00:00Z' }));
  });

  it('pay → settleLedger(payout) once, and the ledger payment is audited', async () => {
    m.payouts.settleLedger.mockResolvedValue(PAYMENT);
    const res = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: {} });
    expect(res.statusCode).toBe(200);
    expect(m.payouts.settleLedger).toHaveBeenCalledTimes(1);
    expect(m.payouts.settleLedger).toHaveBeenCalledWith(PAYOUT_ID, expect.any(String));
    expect(m.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'teacher_payments', entityId: PAYMENT, after: { payout_id: PAYOUT_ID } }),
    );
  });

  it('nothing outstanding in the ledger (already paid per session) → no second payment, no ledger audit', async () => {
    m.payouts.settleLedger.mockResolvedValue(null);
    expect((await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: {} })).statusCode).toBe(200);
    expect(m.audit.record).not.toHaveBeenCalledWith(expect.objectContaining({ entity: 'teacher_payments' }));
  });

  it('a refused transition (draft → paid) never touches the ledger; approve never settles', async () => {
    m.payouts.get.mockResolvedValue(payoutRow());
    expect((await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/pay`, body: {} })).statusCode).toBe(409);
    expect(m.payouts.settleLedger).not.toHaveBeenCalled();
    m.payouts.get.mockResolvedValue(payoutRow({ month: '2026-08-01' }));
    m.payouts.update.mockResolvedValue(payoutRow({ status: 'approved' }));
    await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/approve` });
    expect(m.payouts.settleLedger).not.toHaveBeenCalled();
  });
});
