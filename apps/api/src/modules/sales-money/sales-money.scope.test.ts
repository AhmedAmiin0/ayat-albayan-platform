import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../common/auth/verify-token';
import type { SalesQueries } from '../sales/sales.queries';
import type { SalesFamilyQueries } from './sales-family.queries';
import { assertOwnStudent, SalesMoneyScope } from './sales-money.scope';

const USER: AuthUser = { id: 'u1', email: null, role: 'sales' };
const OWN = { leadIds: [], guardianIds: [], studentIds: ['s1'], phones: [] };

function setup() {
  const sales = { ownership: vi.fn().mockResolvedValue(OWN) };
  const family = { familyPhone: vi.fn().mockResolvedValue('+966551110000') };
  return { sales, family, scope: new SalesMoneyScope(sales as unknown as SalesQueries, family as unknown as SalesFamilyQueries) };
}

describe('SalesMoneyScope: ownershipOf(...).studentIds, never the booking switch', () => {
  it('assertOwnStudent: her student passes, any other is 403 not_your_student', () => {
    expect(() => assertOwnStudent(OWN, 's1')).not.toThrow();
    expect(() => assertOwnStudent(OWN, 's2')).toThrow(expect.objectContaining({ response: expect.objectContaining({ code: 'not_your_student' }) }));
  });

  it('familyChat: checks ownership first, then resolves the family phone', async () => {
    const t = setup();
    expect(await t.scope.familyChat(USER, 's1')).toBe('+966551110000');
    expect(t.sales.ownership).toHaveBeenCalledWith('u1');
    await expect(t.scope.familyChat(USER, 's2')).rejects.toThrow();
    expect(t.family.familyPhone).toHaveBeenCalledTimes(1);
  });
});
