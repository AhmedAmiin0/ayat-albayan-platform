import { describe, expect, it } from 'vitest';
import { uuidFor } from '@/modules/finance/stripe';
import { cardRow, kit, listed, planOf, REQ, row, SUB } from './stop-refund.fakes';

// Reviewed money cases (owner 2026-11-02): pending refunds, converted / 3-decimal cards, replays.
const actor = { id: 'a1', reason: 'سفر' };

describe('StopRefunds: what the cards can still give back', () => {
  it('a refund still pending in Stripe (no row yet) is taken off «paid» and off its card', async () => {
    const { service, stripe } = kit();
    const pending = { id: 're_p', amount: 4000, status: 'pending', metadata: {} };
    stripe.refunds.list.mockReturnValue(listed([pending]));
    await expect(service.plan(planOf(251))).rejects.toMatchObject({
      status: 409,
    });
    const plan = await service.plan(planOf(250));
    expect(plan.calc.paid).toBe(250);
    expect(plan.split).toEqual({ cards: [{ id: 'p-card', amount: 160 }], manual: 90 });
  });

  it('a pending refund the webhook already recorded is counted once', async () => {
    const { service, stripe, repo } = kit();
    const done = { id: 're_d', amount: 4000, status: 'succeeded', metadata: {} };
    stripe.refunds.list.mockReturnValue(listed([done]));
    const recorded = row({
      id: 'r',
      kind: 'refund',
      amount: 40,
      client_request_id: uuidFor('re_d'),
    });
    repo.money.mockResolvedValue([cardRow(), row(), recorded]);
    const plan = await service.plan(planOf(250));
    expect(plan.calc.paid).toBe(250);
  });

  it('a failed or canceled refund does not count', async () => {
    const { service, stripe } = kit();
    const failed = { id: 're_f', amount: 20000, status: 'failed', metadata: {} };
    stripe.refunds.list.mockReturnValue(listed([failed]));
    const plan = await service.plan(planOf(290));
    expect(plan.split.cards).toEqual([{ id: 'p-card', amount: 200 }]);
  });

  it.each([
    ['converted on record (USD charge)', { original_amount: 53.33, original_currency: 'USD' }],
    ['in KWD (Stripe counts 3 decimals)', { currency: 'KWD' }],
  ])('a card payment %s is refunded by hand, never through Stripe', async (_what, over) => {
    const k = kit();
    k.repo.money.mockResolvedValue([cardRow(over), row()]);
    const plan = await k.service.plan(planOf(100));
    expect(await k.service.execute({ plan, actor })).toEqual({ amount: 100, card: 0, manual: 100 });
    expect(k.stripe.refunds.create).not.toHaveBeenCalled();
  });
});

describe('StopRefunds: a replay of the same stop', () => {
  it('another amount than the card refund it made: 409 refund_mismatch', async () => {
    const { service, stripe } = kit();
    const mine = { id: 're_m', amount: 10000, status: 'succeeded', metadata: { course_stop: REQ } };
    stripe.refunds.list.mockReturnValue(listed([mine]));
    await expect(service.plan(planOf(250))).rejects.toMatchObject({
      status: 409,
    });
    const same = await service.plan(planOf(100));
    expect(await service.execute({ plan: same, actor })).toEqual({
      amount: 100,
      card: 100,
      manual: 0,
    });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });
});
