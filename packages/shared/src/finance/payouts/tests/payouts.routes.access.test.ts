import { describe, expect, it } from 'vitest';
import { myPayoutRoutes, payoutRoutes } from '../payouts.routes';

const accessOf = ({ permissions, tags }: { permissions?: unknown; tags?: unknown }) => ({
  permissions,
  tags,
});
const payouts = (permission: string) => ({ permissions: [permission], tags: ['payouts'] });

describe('payoutRoutes: access', () => {
  it('lets readers open a month and a payout receipt', () => {
    expect(accessOf(payoutRoutes.month)).toEqual(payouts('payouts.read'));
    expect(accessOf(payoutRoutes.receipt)).toEqual(payouts('payouts.read'));
  });

  it('keeps generating, reopening, paying and unpaying for writers', () => {
    const r = payoutRoutes;
    for (const route of [r.generate, r.reopen, r.unpay, r.pay]) {
      expect(accessOf(route)).toEqual(payouts('payouts.write'));
    }
  });

  it('keeps approving for approvers', () => {
    expect(accessOf(payoutRoutes.approve)).toEqual(payouts('payouts.approve'));
  });

  it('shows a teacher only their own payouts, under the teachers tag', () => {
    expect(accessOf(myPayoutRoutes.mine)).toEqual({
      permissions: ['self.teacher'],
      tags: ['teachers'],
    });
  });
});
