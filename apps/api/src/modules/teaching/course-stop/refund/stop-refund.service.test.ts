import { describe, expect, it } from 'vitest';
import { uuidFor } from '@/modules/finance/stripe';
import { cardRefundKey } from './stop-refund.cards';
import { cardRow, custom, kit, listed, REQ, row, SUB } from './stop-refund.fakes';
import { manualRefundKey } from './stop-refund.plan';

// «إلغاء مع استرداد» (owner 2026-11-02): card first through Stripe (the webhook records the row),
// the rest one manual row; idempotent on the stop's clientRequestId. 290 paid (200 card + 90 bank).
const actor = { id: 'a1', reason: 'سفر' };

describe('StopRefunds.plan', () => {
  it.each([
    [0, 100, 290],
    [3, 100, 140],
    [3, 0, 290],
    [3, 150, 65],
    [8, 100, 0],
  ])('%i attended at %i %%: %d refundable', async (attended, rate, refund) => {
    const { service } = kit({ attended, rate });
    const plan = await service
      .plan({ sub: SUB, requestId: REQ, ask: custom(Math.max(refund, 0.01)) })
      .catch(() => null);
    expect(plan?.calc.refund ?? 0).toBe(refund);
  });

  it('above the net paid (the allowed maximum): 409 refund_exceeds_allowed', async () => {
    const { service } = kit({ attended: 3 });
    await expect(service.plan({ sub: SUB, requestId: REQ, ask: custom(290.01) })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('Stripe not configured with a card payment: the 503 comes before anything is done', async () => {
    const { service, clients } = kit();
    clients.client.mockRejectedValue(new Error('stripe_not_configured'));
    await expect(service.plan({ sub: SUB, requestId: REQ, ask: custom(10) })).rejects.toThrow(
      'stripe_not_configured',
    );
  });
});

describe('StopRefunds.execute', () => {
  it('mixed: the card first (one partial Stripe refund with the stop key), then the manual rest', async () => {
    const { service, stripe, ledger } = kit();
    const plan = await service.plan({ sub: SUB, requestId: REQ, ask: custom(250) });
    expect(await service.execute({ plan, actor })).toEqual({ amount: 250, card: 200, manual: 50 });
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      {
        payment_intent: 'pi_1',
        amount: 20000,
        reason: 'requested_by_customer',
        metadata: { course_stop: REQ, payment_id: 'p-card' },
      },
      { idempotencyKey: cardRefundKey(REQ, 'p-card') },
    );
    expect(ledger.manual).toHaveBeenCalledWith({ plan, amount: 50, actor });
    expect(ledger.audit).toHaveBeenCalledWith(expect.objectContaining({ stripe: ['re_new'] }));
  });

  it('within the card: a partial Stripe refund, no manual money', async () => {
    const { service, stripe, ledger } = kit({ attended: 3 });
    const plan = await service.plan({ sub: SUB, requestId: REQ, ask: custom(120.5) });
    expect(await service.execute({ plan, actor })).toEqual({
      amount: 120.5,
      card: 120.5,
      manual: 0,
    });
    expect(stripe.refunds.create.mock.calls[0]?.[0]).toMatchObject({ amount: 12050 });
    expect(ledger.manual).toHaveBeenCalledWith({ plan, amount: 0, actor });
  });

  it('a card refunded before by someone else: only what is left goes to the card', async () => {
    const old = row({
      id: 'r-old',
      kind: 'refund',
      amount: 50,
      method: 'card',
      client_request_id: uuidFor('re_old'),
    });
    const { service, stripe, repo } = kit();
    repo.money.mockResolvedValue([cardRow(), row(), old]);
    const refunded = { id: 're_old', amount: 5000, status: 'succeeded', metadata: {} };
    stripe.refunds.list.mockReturnValue(listed([refunded]));
    const plan = await service.plan({ sub: SUB, requestId: REQ, ask: custom(240) });
    expect(await service.execute({ plan, actor })).toEqual({ amount: 240, card: 150, manual: 90 });
    expect(stripe.refunds.create.mock.calls[0]?.[0]).toMatchObject({ amount: 15000 });
  });

  it('a replay: the card this stop refunded is not refunded again, its row stays out of «paid»', async () => {
    const { service, stripe, repo, ledger } = kit();
    const mine = {
      id: 're_mine',
      amount: 20000,
      status: 'succeeded',
      metadata: { course_stop: REQ },
    };
    stripe.refunds.list.mockReturnValue(listed([mine]));
    const recorded = row({
      id: 'r1',
      kind: 'refund',
      amount: 200,
      method: 'card',
      client_request_id: uuidFor('re_mine'),
    });
    const manual = row({
      id: 'r2',
      kind: 'refund',
      amount: 50,
      client_request_id: manualRefundKey(REQ),
    });
    repo.money.mockResolvedValue([cardRow(), row(), recorded, manual]);
    const plan = await service.plan({ sub: SUB, requestId: REQ, ask: custom(250) });
    expect(plan.calc.paid).toBe(290);
    expect(await service.execute({ plan, actor })).toEqual({ amount: 250, card: 200, manual: 50 });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(ledger.audit).not.toHaveBeenCalled();
    expect(ledger.manual).toHaveBeenCalledWith({ plan, amount: 50, actor });
  });

  it('no card payment: Stripe is never called', async () => {
    const { service, clients, repo } = kit();
    repo.intents.mockResolvedValue(new Map());
    const plan = await service.plan({ sub: SUB, requestId: REQ, ask: custom(290) });
    expect(await service.execute({ plan, actor })).toEqual({ amount: 290, card: 0, manual: 290 });
    expect(clients.client).not.toHaveBeenCalled();
  });
});
