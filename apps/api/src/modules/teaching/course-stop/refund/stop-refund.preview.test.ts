import { describe, expect, it } from 'vitest';
import { kit, listed, planOf, REQ, SUB } from './stop-refund.fakes';

// Review 2026-11-05: the sheet's maximum is the plan's maximum (one function, StopRefunds.allowed),
// so the default amount the sheet offers never meets 409 refund_exceeds_allowed.
describe('StopRefunds.preview = the plan’s maximum', () => {
  it('a refund still pending in Stripe is taken off the sheet’s maximum too', async () => {
    const { service, stripe } = kit();
    const pending = { id: 're_p', amount: 4000, status: 'pending', metadata: {} };
    stripe.refunds.list.mockReturnValue(listed([pending]));
    const shown = await service.preview(SUB);
    expect([shown.paid, shown.refund]).toEqual([250, 250]);
    const plan = await service.plan(planOf(shown.refund));
    expect(plan.amount).toBe(250);
  });

  it('the same lines as the plan without a pending refund', async () => {
    const { service } = kit({ attended: 3 });
    const shown = await service.preview(SUB);
    const plan = await service.plan(planOf(shown.refund));
    expect(shown).toEqual(plan.calc);
    expect(shown.refund).toBe(140);
  });

  it('a refund another stop made is never the preview’s own', async () => {
    const { service, stripe } = kit();
    const other = { id: 're_o', amount: 4000, status: 'pending', metadata: { course_stop: REQ } };
    stripe.refunds.list.mockReturnValue(listed([other]));
    expect((await service.preview(SUB)).refund).toBe(250);
  });
});
