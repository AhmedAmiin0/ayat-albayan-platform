import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { REQUIRE_ON, ruleWith } from '@/modules/sales/sales/rule/sales-ownership-rule.fakes';
import type { SalesFamilyRepo } from './reads/sales-family.repo';
import { assertOwnStudent, assertSalesDiscount, SalesMoneyScope } from './sales-money.scope';

const USER: AuthUser = { id: 'u1', email: null, role: 'sales' };
const OWN = { leadIds: [], guardianIds: [], studentIds: ['s1'], phones: [] };

/** The rule enforcing by default here (require + auto ON); `over` switches it. */
function setup(over: object = REQUIRE_ON) {
  const { sales, rule } = ruleWith(OWN, over);
  const family = {
    familyPhone: vi.fn().mockResolvedValue('+966551110000'),
    phonesOf: vi.fn().mockResolvedValue(['+966551110000', '+966552220000']),
  };
  return { sales, family, scope: new SalesMoneyScope(rule, family as unknown as SalesFamilyRepo) };
}

describe('SalesMoneyScope: ANY student while the rule does not enforce (owner 2026-11-02)', () => {
  it.each([
    ['require off, auto on (the defaults)', { sales_require_assignee: false, sales_auto_assign: true }],
    ['require on, auto off', { sales_require_assignee: true, sales_auto_assign: false }],
  ])('%s: assertOwns / assertRenews pass for a student assigned to nobody, ownership never read', async (_l, over) => {
    const t = setup(over);
    await expect(t.scope.assertOwns(USER, 's2')).resolves.toBeUndefined();
    await expect(t.scope.assertRenews(USER, 's2')).resolves.toBeUndefined();
    expect(await t.scope.ownership(USER)).toBeNull();
    expect(t.sales.ownership).not.toHaveBeenCalled();
  });

  it('require on and auto on: 403 not_your_student for the same student', async () => {
    const t = setup();
    await expect(t.scope.assertRenews(USER, 's2')).rejects.toMatchObject({ response: { code: 'not_your_student' } });
  });
});

describe('SalesMoneyScope while enforced: ownershipOf(...).studentIds', () => {
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

  it('assertRenews with sales.renew_any (owner 2026-11-01): ANY student, no ownership read', async () => {
    const t = setup();
    t.sales.ownership.mockResolvedValue({ ...OWN, studentIds: [] });
    const renewer: AuthUser = { ...USER, permissions: ['sales.renew_any'] };
    await expect(t.scope.assertRenews(renewer, 's2')).resolves.toBeUndefined();
    expect(t.sales.ownership).not.toHaveBeenCalled();
    expect(await t.scope.familyChat(renewer, 's2', '+966559990000')).toBe('+966551110000');
    await expect(t.scope.assertRenews(USER, 's2')).rejects.toThrow();
  });

  it('assertOwns stays hers only, whatever the key («إلغاء الباقة», a payment link’s teacher)', async () => {
    const t = setup();
    const renewer: AuthUser = { ...USER, permissions: ['sales.renew_any'] };
    await expect(t.scope.assertOwns(renewer, 's1')).resolves.toBeUndefined();
    await expect(t.scope.assertOwns(renewer, 's2')).rejects.toThrow();
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
