import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { enforcesOwnership } from './sales-ownership-rule';
import { REQUIRE_ON, ruleWith } from './sales-ownership-rule.fakes';

const OWN = { leadIds: ['l1'], guardianIds: [], studentIds: ['s1'], phones: [] };
const USER: AuthUser = { id: 'p-sales', email: null, role: 'sales' };

describe('enforcesOwnership (require × auto)', () => {
  it.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, false],
  ])('require %s, auto %s → enforced %s', (require, auto, enforced) => {
    const switches = { sales_require_assignee: require, sales_auto_assign: auto };
    expect(enforcesOwnership(switches)).toBe(enforced);
  });

  it('the shipped defaults (require off, auto on) do not enforce', () => {
    expect(SETTING_DEFAULTS.sales_require_assignee).toBe(false);
    expect(SETTING_DEFAULTS.sales_auto_assign).toBe(true);
    expect(enforcesOwnership(SETTING_DEFAULTS)).toBe(false);
  });
});

describe('SalesOwnershipRule', () => {
  it('both switches on: enforced, her ownership by her id', async () => {
    const { rule, sales } = ruleWith(OWN, REQUIRE_ON);
    expect(await rule.enforced()).toBe(true);
    expect(await rule.scope(USER)).toEqual(OWN);
    expect(sales.ownership).toHaveBeenCalledWith('p-sales');
  });

  it.each([
    ['the defaults', {}],
    ['require on, auto off', { sales_require_assignee: true, sales_auto_assign: false }],
  ])('%s: null (no check), her ownership never read', async (_l, over) => {
    const { rule, sales } = ruleWith(OWN, over);
    expect(await rule.scope(USER)).toBeNull();
    expect(sales.ownership).not.toHaveBeenCalled();
  });
});
