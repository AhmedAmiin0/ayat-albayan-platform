import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PAYOUT_ID, payoutRow } from '../subscriptions/money/money.fakes';
import { ADMIN, moneyApp, resetMocks, type Mocks } from '../subscriptions/test-app';

// Payout corrections (migration 20261005000201): reopen approved → draft, un-pay paid → approved.

describe('payout corrections', () => {
  let app: NestFastifyApplication;
  let m: Mocks;
  let call: Awaited<ReturnType<typeof moneyApp>>['call'];

  beforeAll(async () => ({ app, m, call } = await moneyApp()));
  afterAll(() => app.close());
  beforeEach(() => resetMocks(m));

  it('reopen: approved → draft through the RPC; a paid or draft payout is 409', async () => {
    m.payouts.get.mockResolvedValueOnce(payoutRow({ status: 'approved' })).mockResolvedValue(payoutRow());
    const res = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/reopen` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'draft', ledger_paid: 0 });
    expect(m.corrections.reopenPayout).toHaveBeenCalledWith({ payoutId: PAYOUT_ID, actorId: ADMIN.id });
    for (const status of ['paid', 'draft'] as const) {
      m.payouts.get.mockReset().mockResolvedValue(payoutRow({ status }));
      expect((await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/reopen` })).json().code).toBe('invalid_transition');
    }
    expect(m.corrections.reopenPayout).toHaveBeenCalledTimes(1);
  });

  it('unpay: paid → approved with a reason; no reason is 400; an open payout is 409', async () => {
    m.payouts.get.mockResolvedValueOnce(payoutRow({ status: 'paid', paid_at: '2026-10-01T09:00:00Z' }));
    m.payouts.get.mockResolvedValue(payoutRow({ status: 'approved', approved_at: '2026-10-01T09:00:00Z' }));
    const res = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/unpay`, body: { reason: 'حُوّل خطأ' } });
    expect(res.statusCode).toBe(200);
    expect(m.corrections.unpayPayout).toHaveBeenCalledWith({ payoutId: PAYOUT_ID, actorId: ADMIN.id, reason: 'حُوّل خطأ' });
    expect((await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/unpay`, body: {} })).statusCode).toBe(400);
    m.payouts.get.mockReset().mockResolvedValue(payoutRow({ status: 'approved' }));
    const open = await call({ method: 'POST', url: `/payouts/${PAYOUT_ID}/unpay`, body: { reason: 'خطأ في الشهر' } });
    expect(open.json().code).toBe('invalid_transition');
  });

  it('a teacher can reach none of them', async () => {
    for (const action of ['reopen', 'unpay', 'receipt']) {
      const res = await call({ method: action === 'receipt' ? 'GET' : 'POST', url: `/payouts/${PAYOUT_ID}/${action}`, token: 'teacher' });
      expect(res.statusCode).toBe(403);
    }
  });

  it('the payout receipt is signed for the admin; none → 404', async () => {
    m.payouts.get.mockResolvedValue(payoutRow({ status: 'paid', receipt_path: 't/r.jpg', paid_at: '2026-10-01T09:00:00Z' }));
    m.storage.signedDownload.mockResolvedValue({ url: 'https://x', expires_at: '2026-10-01T10:00:00Z' });
    expect((await call({ method: 'GET', url: `/payouts/${PAYOUT_ID}/receipt` })).json()).toMatchObject({ url: 'https://x' });
    m.payouts.get.mockResolvedValue(payoutRow());
    expect((await call({ method: 'GET', url: `/payouts/${PAYOUT_ID}/receipt` })).statusCode).toBe(404);
  });
});
