import { describe, expect, it } from 'vitest';
import { planEarningSync, type SyncEarning, type SyncInput } from './earning-sync.js';

const RATES = { 30: 50, 45: 70, 60: 90, 90: null };
const earning = (patch: Partial<SyncEarning> = {}): SyncEarning => ({
  teacherId: 't1', minutes: 45, rate: 70, amount: 70, paid_amount: 0, status: 'earned', ...patch,
});
const input = (patch: Partial<SyncInput> & { status?: string; minutes?: number } = {}): SyncInput => ({
  lesson: { status: patch.status ?? 'completed', minutes: patch.minutes ?? 45, teacherId: 't1' },
  earning: patch.earning ?? null,
  rates: RATES,
  countLate: patch.countLate ?? false,
  countNoShow: patch.countNoShow ?? false,
});

describe('planEarningSync: which lessons count (payout_count_late / payout_count_no_show)', () => {
  it('completed → an earning at the teacher rate for its length', () => {
    expect(planEarningSync(input())).toEqual({ kind: 'insert', rate: 70, amount: 70 });
  });

  it('late and no_show count only when the owner turned them on', () => {
    expect(planEarningSync(input({ status: 'late' }))).toEqual({ kind: 'none' });
    expect(planEarningSync(input({ status: 'late', countLate: true }))).toMatchObject({ kind: 'insert' });
    expect(planEarningSync(input({ status: 'no_show' }))).toEqual({ kind: 'none' });
    expect(planEarningSync(input({ status: 'no_show', countNoShow: true }))).toMatchObject({ kind: 'insert' });
    expect(planEarningSync(input({ status: 'late', countNoShow: true }))).toEqual({ kind: 'none' });
  });

  it('other statuses never count; no rate or an unusual length: nothing', () => {
    for (const status of ['scheduled', 'confirmed', 'cancelled', 'excused']) expect(planEarningSync(input({ status }))).toEqual({ kind: 'none' });
    expect(planEarningSync(input({ minutes: 90 }))).toEqual({ kind: 'none' });
    expect(planEarningSync(input({ minutes: 50 }))).toEqual({ kind: 'none' });
  });
});

describe('planEarningSync: a corrected duration (PATCH /lessons/:id/time)', () => {
  it('unpaid: re-priced with the rate for the new length', () => {
    const r = planEarningSync(input({ minutes: 60, earning: earning() }));
    expect(r).toEqual({ kind: 'update', rate: 90, amount: 90, status: 'earned' });
  });

  it('partly paid: follows the lesson; status stays partially_paid, or turns paid when the new amount is covered', () => {
    const part = earning({ paid_amount: 40, status: 'partially_paid' });
    expect(planEarningSync(input({ minutes: 60, earning: part }))).toEqual({ kind: 'update', rate: 90, amount: 90, status: 'partially_paid' });
    expect(planEarningSync(input({ minutes: 30, earning: { ...part, paid_amount: 50 } }))).toEqual({ kind: 'update', rate: 50, amount: 50, status: 'paid' });
  });

  it('fully paid: frozen, a correction changes nothing', () => {
    const paid = earning({ paid_amount: 70, status: 'paid' });
    expect(planEarningSync(input({ minutes: 60, earning: paid }))).toEqual({ kind: 'none' });
  });

  it('same length keeps the frozen rate even when the teacher rate changed', () => {
    const r = planEarningSync({ ...input({ earning: earning({ rate: 60, amount: 60 }) }), rates: { ...RATES, 45: 100 } });
    expect(r).toEqual({ kind: 'update', rate: 60, amount: 60, status: 'earned' });
  });

  it('a new length without a rate cannot be priced: unpaid is removed', () => {
    expect(planEarningSync(input({ minutes: 90, earning: earning() }))).toEqual({ kind: 'delete' });
  });
});

describe('planEarningSync: the lesson stops counting (corrected report)', () => {
  it('unpaid earning is deleted', () => {
    expect(planEarningSync(input({ status: 'cancelled', earning: earning() }))).toEqual({ kind: 'delete' });
  });

  it('partly paid earning is capped at what was paid; a paid one stays', () => {
    const part = earning({ paid_amount: 30, status: 'partially_paid' });
    expect(planEarningSync(input({ status: 'excused', earning: part }))).toEqual({ kind: 'cap', amount: 30 });
    expect(planEarningSync(input({ status: 'excused', earning: earning({ paid_amount: 70, status: 'paid' }) }))).toEqual({ kind: 'none' });
  });

  it('late → completed again after the owner turned late off: back to counted', () => {
    expect(planEarningSync(input({ status: 'completed', earning: earning() }))).toMatchObject({ kind: 'update' });
  });
});
