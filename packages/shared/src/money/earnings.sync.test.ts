import { describe, expect, it } from 'vitest';
import { planEarningSync, type EarningSyncInput } from './earnings.plan.js';

const base = (over: Partial<EarningSyncInput> = {}, lesson: Partial<EarningSyncInput['lesson']> = {}): EarningSyncInput => ({
  lesson: { status: 'completed', minutes: 45, teacherId: 't1', startsAt: '2026-09-03T10:00:00Z', ...lesson },
  settings: { countLate: false, countNoShow: false },
  rate: 70,
  existing: null,
  ...over,
});
const row = (o: Partial<NonNullable<EarningSyncInput['existing']>> = {}) => ({
  status: 'earned' as const, minutes: 45, teacherId: 't1', rate: 70, paid: 0, ...o,
});

describe('planEarningSync: when a lesson becomes paid', () => {
  it('completed creates one earning at the current rate', () => {
    expect(planEarningSync(base())).toEqual({ kind: 'create', minutes: 45, rate: 70 });
  });
  it('late / no_show create only when the owner counts them', () => {
    expect(planEarningSync(base({}, { status: 'late' }))).toEqual({ kind: 'none' });
    expect(planEarningSync(base({ settings: { countLate: true, countNoShow: false } }, { status: 'late' }))).toMatchObject({ kind: 'create' });
    expect(planEarningSync(base({}, { status: 'no_show' }))).toEqual({ kind: 'none' });
    expect(planEarningSync(base({ settings: { countLate: false, countNoShow: true } }, { status: 'no_show' }))).toMatchObject({ kind: 'create' });
  });
  it('scheduled / cancelled / excused earn nothing', () => {
    for (const status of ['scheduled', 'confirmed', 'excused', 'cancelled_by_admin', 'rescheduled'] as const)
      expect(planEarningSync(base({}, { status }))).toEqual({ kind: 'none' });
  });
  it('no rate for the length, or a length outside 30/45/60/90, earns nothing', () => {
    expect(planEarningSync(base({ rate: null }))).toEqual({ kind: 'none' });
    expect(planEarningSync(base({}, { minutes: 50 }))).toEqual({ kind: 'none' });
  });
});

describe('planEarningSync: a lesson that changes after it earned (corrected time, reopened)', () => {
  it('an unpaid earning follows a corrected length at the new length\'s rate', () => {
    const a = planEarningSync(base({ rate: 90, existing: row() }, { minutes: 60 }));
    expect(a).toEqual({ kind: 'update', minutes: 60, rate: 90, amount: 90, status: 'earned', rehome: true });
  });
  it('the frozen rate is kept while length and teacher are unchanged (a later rate rise is not retroactive)', () => {
    const a = planEarningSync(base({ rate: 100, existing: row({ rate: 70 }) }));
    expect(a).toMatchObject({ kind: 'update', rate: 70, amount: 70 });
  });
  it('a partially paid earning follows the correction but keeps its payments (status recomputed)', () => {
    const a = planEarningSync(base({ rate: 90, existing: row({ status: 'partially_paid', paid: 30 }) }, { minutes: 60 }));
    expect(a).toEqual({ kind: 'update', minutes: 60, rate: 90, amount: 90, status: 'partially_paid', rehome: false });
    const shrunk = planEarningSync(base({ rate: 50, existing: row({ status: 'partially_paid', paid: 60, rate: 90, minutes: 60 }) }, { minutes: 30 }));
    expect(shrunk).toMatchObject({ kind: 'update', amount: 50, status: 'paid' });
  });
  it('a fully paid earning is frozen, whatever the lesson does afterwards', () => {
    expect(planEarningSync(base({ existing: row({ status: 'paid', paid: 70 }) }, { minutes: 60 }))).toEqual({ kind: 'none' });
    expect(planEarningSync(base({ existing: row({ status: 'paid', paid: 70 }) }, { status: 'cancelled_by_admin' }))).toEqual({ kind: 'none' });
  });
  it('a lesson that stops being paid deletes an unpaid earning but never one with payments', () => {
    expect(planEarningSync(base({ existing: row() }, { status: 'scheduled' }))).toEqual({ kind: 'delete' });
    expect(planEarningSync(base({ existing: row({ status: 'partially_paid', paid: 20 }) }, { status: 'scheduled' }))).toEqual({ kind: 'none' });
  });
  it('a teacher change re-prices an unpaid earning at the new teacher\'s rate', () => {
    const a = planEarningSync(base({ rate: 40, existing: row({ teacherId: 't0' }) }));
    expect(a).toMatchObject({ kind: 'update', rate: 40, rehome: true });
  });
});
