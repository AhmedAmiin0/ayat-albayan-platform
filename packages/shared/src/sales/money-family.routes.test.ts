import { DEFAULT_RENEWAL_PRICING } from '@ab/money';
import { describe, expect, it } from 'vitest';
import { salesFamilyStudent, salesOwedPackage } from '../testing/sales/sales-family';
import { salesMoneyFamilyRoutes as routes } from './money-family.routes';

const accepts = (v: unknown): boolean => routes.family.response.safeParse(v).success;
const family = (...students: unknown[]) => ({ students });

describe('salesMoneyFamilyRoutes.family', () => {
  it('keeps the path, the permission and the tag the api serves today', () => {
    const { method, path, permissions, tags } = routes.family;
    expect([method, path, permissions, tags]).toEqual([
      'GET',
      '/sales/money/family',
      ['self.sales_money'],
      ['sales'],
    ]);
  });

  it('takes the chat phone in E.164 only', () => {
    const phone = '+966551110000';
    expect(routes.family.query.parse({ phone })).toEqual({ phone });
    expect(routes.family.query.safeParse({ phone: 'abc' }).success).toBe(false);
    expect(routes.family.query.safeParse({}).success).toBe(false);
  });

  it('accepts an empty family and a child with its package owed and renewal seed', () => {
    expect(routes.family.response.parse(family())).toEqual(family());
    const kid = salesFamilyStudent({ open: [salesOwedPackage()], renew_due: true });
    expect(routes.family.response.parse(family(kid))).toEqual(family(kid));
    const { mine: _mine, ...old } = kid;
    expect(accepts(family(old))).toBe(true);
  });

  it('drops the price source or notes of a package owed', () => {
    const open = [{ ...salesOwedPackage(), price_source: {}, notes: 'x' }];
    const out = routes.family.response.parse(family(salesFamilyStudent({ open })));
    expect(out.students[0]?.open).toEqual([salesOwedPackage()]);
  });

  it('refuses an unknown status, a renewal outside the calculator or a missing teacher', () => {
    expect(accepts(family({ ...salesFamilyStudent(), status: 'gone' }))).toBe(false);
    const renewal = { ...DEFAULT_RENEWAL_PRICING, pkg: 'gold' };
    expect(accepts(family({ ...salesFamilyStudent(), renewal }))).toBe(false);
    const { teacher_id: _t, ...noTeacher } = salesFamilyStudent();
    expect(accepts(family(noTeacher))).toBe(false);
  });
});
