import { describe, expect, it } from 'vitest';
import {
  alertPlan,
  statusChanges,
  unpaidFlagged,
  withChanges,
  type PlanBalance,
  type PlanPackage,
} from './packages.plan';

const pkg = (id: string, patch: Partial<PlanPackage> = {}): PlanPackage => ({
  id,
  status: 'unpaid',
  price: 145,
  lessons_total: 4,
  ...patch,
});
const bal = (entries: [string, number, number][]) =>
  new Map<string, PlanBalance>(entries.map(([id, used, remaining]) => [id, { lessons_used: used, remaining }]));

describe('statusChanges (R-SUB-01: statuses always derived)', () => {
  it('journey 3: a full payment turns the unpaid package active', () => {
    const subs = [pkg('a')];
    const changes = statusChanges({ subs, balances: bal([['a', 1, 3]]), paid: new Map([['a', 145]]) });
    expect(changes).toEqual([{ id: 'a', from: 'unpaid', to: 'active' }]);
  });

  it('a part payment leaves it unpaid: no change', () => {
    const changes = statusChanges({ subs: [pkg('a')], balances: bal([['a', 1, 3]]), paid: new Map([['a', 100]]) });
    expect(changes).toEqual([]);
  });

  it('an older used-up package becomes expired once a newer one exists', () => {
    const subs = [pkg('old', { status: 'active' }), pkg('new')];
    const balances = bal([
      ['old', 4, 0],
      ['new', 0, 4],
    ]);
    const changes = statusChanges({ subs, balances, paid: new Map([['old', 145]]) });
    expect(changes).toEqual([{ id: 'old', from: 'active', to: 'expired' }]);
  });

  it('the newest package used up with no renewal → unpaid', () => {
    const changes = statusChanges({
      subs: [pkg('a', { status: 'active' })],
      balances: bal([['a', 4, 0]]),
      paid: new Map([['a', 145]]),
    });
    expect(changes).toEqual([{ id: 'a', from: 'active', to: 'unpaid' }]);
  });

  it('a package missing from the view counts as untouched (all lessons left)', () => {
    const changes = statusChanges({ subs: [pkg('a', { price: 0 })], balances: new Map(), paid: new Map() });
    expect(changes).toEqual([{ id: 'a', from: 'unpaid', to: 'active' }]);
  });

  it('paused stays paused', () => {
    const subs = [pkg('a', { status: 'paused' })];
    expect(statusChanges({ subs, balances: bal([['a', 0, 4]]), paid: new Map() })).toEqual([]);
  });

  it('withChanges applies the new statuses', () => {
    const subs = withChanges([pkg('a'), pkg('b')], [{ id: 'b', from: 'unpaid', to: 'active' }]);
    expect(subs.map((s) => s.status)).toEqual(['unpaid', 'active']);
  });
});

describe('alertPlan (R-SUB-02: 2 left → renewal, 0 → unpaid)', () => {
  it('no packages → nothing', () => {
    expect(alertPlan({ subs: [], balances: new Map(), threshold: 2 })).toBeNull();
  });

  it('2 left on an active package → renewal on it, with the totals for the label', () => {
    const plan = alertPlan({ subs: [pkg('a', { status: 'active' })], balances: bal([['a', 2, 2]]), threshold: 2 });
    expect(plan).toEqual({ alert: 'renewal', subscriptionId: 'a', used: 2, total: 4 });
  });

  it('3 left → nothing yet', () => {
    expect(alertPlan({ subs: [pkg('a', { status: 'active' })], balances: bal([['a', 1, 3]]), threshold: 2 })).toBeNull();
  });

  it('an early renewal silences the alert: the student total counts', () => {
    const subs = [pkg('old', { status: 'active' }), pkg('new', { status: 'active' })];
    const balances = bal([
      ['old', 3, 1],
      ['new', 0, 4],
    ]);
    expect(alertPlan({ subs, balances, threshold: 2 })).toBeNull();
  });

  it('used up → unpaid on the newest package', () => {
    const subs = [pkg('old', { status: 'expired' }), pkg('new', { status: 'unpaid' })];
    const balances = bal([
      ['old', 4, 0],
      ['new', 4, 0],
    ]);
    expect(alertPlan({ subs, balances, threshold: 2 })).toMatchObject({ alert: 'unpaid', subscriptionId: 'new' });
  });

  it('a paused newest package raises nothing', () => {
    expect(alertPlan({ subs: [pkg('a', { status: 'paused' })], balances: bal([['a', 4, 0]]), threshold: 2 })).toBeNull();
  });
});

describe('unpaidFlagged (R-SUB-02: future lessons flagged, never cancelled)', () => {
  it('newest unpaid with nothing left → flagged', () => {
    expect(unpaidFlagged({ subs: [pkg('a')], balances: bal([['a', 5, -1]]) })).toBe(true);
  });

  it('unpaid but lessons left (not paid yet, still running) → not flagged', () => {
    expect(unpaidFlagged({ subs: [pkg('a')], balances: bal([['a', 1, 3]]) })).toBe(false);
  });

  it('active and used up → not flagged (status decides)', () => {
    expect(unpaidFlagged({ subs: [pkg('a', { status: 'active' })], balances: bal([['a', 4, 0]]) })).toBe(false);
  });

  it('no packages → not flagged', () => {
    expect(unpaidFlagged({ subs: [], balances: new Map() })).toBe(false);
  });
});
