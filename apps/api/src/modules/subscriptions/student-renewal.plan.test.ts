import { describe, expect, it } from 'vitest';
import { isFlipBy, manualWins, packageEnded, recordedFrom, renewalTarget, revertTarget, subscriptionEnded, type EndPackage } from './student-renewal.plan';

const pkg = (p: Partial<EndPackage> = {}): EndPackage => ({ status: 'active', renews_on: null, price: 290, paid: 290, remaining: 3, ...p });
const TODAY = '2026-10-12';

describe('packageEnded / subscriptionEnded: lessons used up or the renewal date passed, no newer paid package', () => {
  it('lessons used up, or renews_on before today; the renewal day itself has not passed', () => {
    expect(packageEnded(pkg({ remaining: 0 }), TODAY)).toBe(true);
    expect(packageEnded(pkg({ renews_on: '2026-10-11' }), TODAY)).toBe(true);
    expect(packageEnded(pkg({ renews_on: TODAY }), TODAY)).toBe(false);
    expect(packageEnded(pkg(), TODAY)).toBe(false);
  });

  it('the only package used up → ended; a running paid package → not ended', () => {
    expect(subscriptionEnded([pkg({ remaining: 0, status: 'unpaid' })], TODAY)).toBe(true);
    expect(subscriptionEnded([pkg()], TODAY)).toBe(false);
  });

  it('a newer package fully paid (or paused by hand) keeps it running; an unpaid or part-paid renewal does not', () => {
    const old = pkg({ remaining: 0, status: 'expired' });
    expect(subscriptionEnded([old, pkg()], TODAY)).toBe(false);
    expect(subscriptionEnded([old, pkg({ status: 'paused', paid: 0 })], TODAY)).toBe(false);
    expect(subscriptionEnded([old, pkg({ status: 'unpaid', paid: 0 })], TODAY)).toBe(true);
    expect(subscriptionEnded([old, pkg({ status: 'unpaid', paid: 100 })], TODAY)).toBe(true);
  });

  it('a first package paid in part has not ended; trial packages and no packages never end it', () => {
    expect(subscriptionEnded([pkg({ status: 'unpaid', paid: 100 })], TODAY)).toBe(false);
    expect(subscriptionEnded([pkg({ status: 'trial', remaining: 0 })], TODAY)).toBe(false);
    expect(subscriptionEnded([], TODAY)).toBe(false);
  });
});

describe('renewalTarget / revertTarget', () => {
  it('active ↔ pending_renewal, expired → active on renewal; not-subscribed, paused, churned untouched', () => {
    expect(renewalTarget('active', true)).toBe('pending_renewal');
    expect(renewalTarget('pending_renewal', false)).toBe('active');
    expect(renewalTarget('expired', false)).toBe('active');
    expect(renewalTarget('active', false)).toBeNull();
    expect(renewalTarget('pending_renewal', true)).toBeNull();
    expect(renewalTarget('expired', true)).toBeNull();
    for (const s of ['new', 'trial', 'pending_subscription', 'paused', 'churned'] as const) {
      expect(renewalTarget(s, true)).toBeNull();
      expect(renewalTarget(s, false)).toBeNull();
    }
  });

  it('another positive payment remains → active, or pending_renewal when ended (whatever the trial)', () => {
    const facts = { open: true, attended: true, paid: true };
    expect(revertTarget({ otherPayment: true, ended: false, facts })).toBe('active');
    expect(revertTarget({ otherPayment: true, ended: true, facts })).toBe('pending_renewal');
  });

  it('none left → by the trial facts: attended → pending_subscription, open trial → trial, none → new', () => {
    const at = (open: boolean, attended: boolean) => revertTarget({ otherPayment: false, ended: true, facts: { open, attended, paid: false } });
    expect(at(false, true)).toBe('pending_subscription');
    expect(at(true, true)).toBe('pending_subscription');
    expect(at(true, false)).toBe('trial');
    expect(at(false, false)).toBe('new');
  });
});

describe('isFlipBy / manualWins: whose status change is the newest', () => {
  const flip = { after: { status: 'active', via: 'payment', payment_id: 'p1' }, at: '2026-10-01T10:00:00Z' };
  const manual = { after: { status: 'active' }, at: '2026-10-05T10:00:00Z' };

  it('the flip of this payment only', () => {
    expect(isFlipBy(flip, 'p1')).toBe(true);
    expect(isFlipBy(flip, 'p2')).toBe(false);
    expect(isFlipBy(manual, 'p1')).toBe(false);
    expect(isFlipBy(null, 'p1')).toBe(false);
  });

  it('recordedFrom: the flip’s from-status, null on older rows or unknown values', () => {
    expect(recordedFrom({ ...flip, after: { ...flip.after, from: 'expired' } })).toBe('expired');
    expect(recordedFrom(flip)).toBeNull();
    expect(recordedFrom({ ...flip, after: { from: 'bogus' } })).toBeNull();
    expect(recordedFrom(null)).toBeNull();
  });

  it('a manual change wins until a renewal date on or after its day passes', () => {
    expect(manualWins(manual, { renewDates: [], localDay: '2026-10-05' })).toBe(true);
    expect(manualWins(manual, { renewDates: ['2026-10-04'], localDay: '2026-10-05' })).toBe(true);
    expect(manualWins(manual, { renewDates: ['2026-10-05'], localDay: '2026-10-05' })).toBe(false);
    expect(manualWins(flip, { renewDates: [], localDay: '2026-10-01' })).toBe(false);
    expect(manualWins(null, { renewDates: [], localDay: '2026-10-01' })).toBe(false);
  });
});
