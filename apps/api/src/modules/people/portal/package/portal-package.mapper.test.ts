import { describe, expect, it } from 'vitest';
import { balanceView, PAYMENTS } from '@/modules/people/portal/portal.family.fakes';
import { readsMoney, toPortalPackage, toPortalPackageView } from './portal-package.mapper';

describe('portal package mapper (docs/50 §5)', () => {
  it('money is read by a guardian or an adult who is their own contact, never a child', () => {
    expect(readsMoney('guardian', { contact_is_self: false })).toBe(true);
    expect(readsMoney('student', { contact_is_self: true })).toBe(true);
    expect(readsMoney('student', { contact_is_self: false })).toBe(false);
    expect(readsMoney(null, { contact_is_self: false })).toBe(false);
  });

  it('the current package with the family balance; never the price, fx or notes', () => {
    const out = toPortalPackage(balanceView());
    expect(out).toEqual({
      package: '8', duration: 30, lessons_total: 8, lessons_used: 3, remaining: 5,
      starts_on: '2026-10-01', renews_on: '2026-11-01', status: 'active',
      amount_due: { amount: 90, currency: 'SAR' },
    });
    expect(JSON.stringify(out)).not.toMatch(/price|fx_rate|notes|paid"/);
  });

  it('no current package: null; the instructions are trimmed', () => {
    const empty = { ...balanceView(), current: null, packages: [] };
    expect(toPortalPackage(empty)).toBeNull();
    const view = toPortalPackageView({ balance: empty, payments: PAYMENTS, instructions: '  حوّل  ' });
    expect(view).toEqual({ package: null, payments: PAYMENTS, payment_instructions: 'حوّل' });
  });
});
