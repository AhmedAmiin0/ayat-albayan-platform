import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../../common/auth/verify-token';
import type { SalesQueries } from '../sales/sales.queries';
import type { SalesFamilyQueries } from './reads/sales-family.queries';
import { assertOwnStudent, assertSalesDiscount, SalesMoneyScope } from './sales-money.scope';

const USER: AuthUser = { id: 'u1', email: null, role: 'sales' };
const OWN = { leadIds: [], guardianIds: [], studentIds: ['s1'], phones: [] };

function setup() {
  const sales = { ownership: vi.fn().mockResolvedValue(OWN) };
  const family = {
    familyPhone: vi.fn().mockResolvedValue('+966551110000'),
    phonesOf: vi.fn().mockResolvedValue(['+966551110000', '+966552220000']),
  };
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

  it('familyChat: the chat she is in when it is one of the family numbers (a second number), else the main chat', async () => {
    const t = setup();
    expect(await t.scope.familyChat(USER, 's1', '+966552220000')).toBe('+966552220000');
    expect(t.family.familyPhone).not.toHaveBeenCalled();
    expect(await t.scope.familyChat(USER, 's1', '+966559990000')).toBe('+966551110000');
    expect(t.family.phonesOf).toHaveBeenCalledWith('s1');
  });

  it('assertOwns with sales.renew_any: a student of the chat’s family by its second number passes; none without it', async () => {
    const t = setup();
    t.sales.ownership.mockResolvedValue({ ...OWN, studentIds: [] });
    const renewer: AuthUser = { ...USER, permissions: ['sales.renew_any'] };
    await expect(t.scope.assertOwns(renewer, 's1', '+966552220000')).resolves.toBeUndefined();
    await expect(t.scope.assertOwns(renewer, 's1', '+966559990000')).rejects.toThrow();
    await expect(t.scope.assertOwns(USER, 's1', '+966552220000')).rejects.toThrow();
  });
});

describe('assertSalesDiscount: the website pills only (owner 2026-10-12)', () => {
  const code = (discount?: number) => {
    try {
      assertSalesDiscount({ discount });
      return 'ok';
    } catch (e) {
      return (e as { response?: { code?: string } }).response?.code;
    }
  };

  it('0, 5, 10, 15 and an omitted discount pass', () => {
    expect([0, 5, 10, 15, undefined].map(code)).toEqual(['ok', 'ok', 'ok', 'ok', 'ok']);
  });

  it('anything else is 403 discount_not_allowed', () => {
    expect([20, 12.5, 99.5, 100, 1].map(code)).toEqual(Array(5).fill('discount_not_allowed'));
  });
});
