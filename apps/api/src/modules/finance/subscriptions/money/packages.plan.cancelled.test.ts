import { describe, expect, it } from 'vitest';
import { alertPlan, statusChanges, unpaidFlagged, type PlanBalance, type PlanPackage } from './packages.plan';

// «إلغاء الباقة» (owner 2026-10-28): a cancelled package is skipped by every decision over a student's packages.

const pkg = (id: string, patch: Partial<PlanPackage> = {}): PlanPackage => ({ id, status: 'unpaid', price: 145, lessons_total: 4, ...patch });
const bal = (entries: [string, number, number][]) =>
  new Map<string, PlanBalance>(entries.map(([id, used, remaining]) => [id, { lessons_used: used, remaining }]));

describe('packages.plan skips a cancelled package', () => {
  it('the recompute never rewrites it (never resurrected), whatever its numbers', () => {
    const subs = [pkg('x', { status: 'cancelled' })];
    expect(statusChanges({ subs, balances: bal([]), paid: new Map([['x', 145]]) })).toEqual([]);
  });

  it('a cancelled newest package does not supersede the running one (no false expired)', () => {
    const subs = [pkg('a', { status: 'active' }), pkg('x', { status: 'cancelled' })];
    const changes = statusChanges({ subs, balances: bal([['a', 4, 0]]), paid: new Map([['a', 145]]) });
    expect(changes).toEqual([{ id: 'a', from: 'active', to: 'unpaid' }]); // used up, no renewal: unpaid (renew)
  });

  it('the alert is on the newest live package and its counts leave the cancelled one out', () => {
    const subs = [pkg('a', { status: 'active' }), pkg('x', { status: 'cancelled', lessons_total: 8 })];
    const plan = alertPlan({ subs, balances: bal([['a', 3, 1]]), threshold: 2 });
    expect(plan).toEqual({ alert: 'renewal', subscriptionId: 'a', used: 3, total: 4 });
  });

  it('only cancelled packages: no alert, no unpaid flag', () => {
    const subs = [pkg('x', { status: 'cancelled' })];
    expect(alertPlan({ subs, balances: bal([]), threshold: 2 })).toBeNull();
    expect(unpaidFlagged({ subs, balances: bal([]) })).toBe(false);
  });

  it('the unpaid flag reads the newest live package', () => {
    const subs = [pkg('a'), pkg('x', { status: 'cancelled' })];
    expect(unpaidFlagged({ subs, balances: bal([['a', 4, 0]]) })).toBe(true);
  });
});
