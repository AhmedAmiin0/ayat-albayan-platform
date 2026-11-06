import { describe, expect, it } from 'vitest';
import { kit, REQ, SUB } from './stop-refund.fakes';

// Review 2026-11-06: the stop committed (stop_owed_amount 150, refund_unattended) but the refund
// failed; the retry re-plans the STORED decision, never live lessons or the live rate. 290 paid,
// 3 attended at 100 % (charge 150) at the stop → 140 back.
const stored = { amount: 150, choice: 'refund_unattended' };
const replay = (ask: { choice: 'unattended' | 'paid' | 'custom'; amount?: number }) => ({
  sub: SUB,
  requestId: REQ,
  ask,
  stored,
});

describe('StopRefunds.plan on a replay', () => {
  it('first attempt: 140 back, 150 stays owed', async () => {
    const { service } = kit({ attended: 3 });
    const plan = await service.plan({ ...replay({ choice: 'unattended' }), stored: null });
    expect([plan.amount, plan.owed]).toEqual([140, stored]);
  });

  it('a lesson ended between the two attempts: the original 140, the stored decision', async () => {
    const { service } = kit({ attended: 4 });
    const plan = await service.plan(replay({ choice: 'unattended' }));
    expect([plan.amount, plan.owed]).toEqual([140, stored]);
  });

  it('the rate changed between the two attempts: the original 140', async () => {
    const { service } = kit({ attended: 3, rate: 150 });
    const plan = await service.plan(replay({ choice: 'unattended' }));
    expect([plan.amount, plan.split]).toEqual([
      140,
      { cards: [{ id: 'p-card', amount: 140 }], manual: 0 },
    ]);
  });

  it.each([[{ choice: 'paid' as const }], [{ choice: 'custom' as const, amount: 100 }]])(
    'a retry asking another decision %o: 409 stop_mismatch, nothing planned',
    async (ask) => {
      const { service } = kit({ attended: 4 });
      await expect(service.plan(replay(ask))).rejects.toThrow('stop_mismatch');
    },
  );

  it('a custom refund replays when it asks the same amount', async () => {
    const { service } = kit({ attended: 4 });
    const custom = { ...replay({ choice: 'custom', amount: 40 }) };
    const plan = await service.plan({
      ...custom,
      stored: { amount: 250, choice: 'refund_custom' },
    });
    expect(plan.amount).toBe(40);
  });
});
