import { describe, expect, it } from 'vitest';
import { STUDENT_STATUSES, type StudentStatus } from '../enums/index.js';
import {
  ACTIVATING_STATUSES,
  isActivating,
  isNotSubscribed,
  isPackageEnded,
  paymentMove,
  registrationStatus,
  revertMove,
  trialMove,
} from './status-flow.js';

// Owner 2026-10-15: new → trial → pending_subscription → active → pending_renewal → expired.

describe('student status groups', () => {
  it('the display order of every status', () => {
    expect(STUDENT_STATUSES).toEqual(['new', 'trial', 'pending_subscription', 'active', 'pending_renewal', 'expired', 'paused', 'churned']);
  });

  it('not subscribed yet = new, trial, pending_subscription', () => {
    expect(STUDENT_STATUSES.filter(isNotSubscribed)).toEqual(['new', 'trial', 'pending_subscription']);
    expect([null, undefined].map(isNotSubscribed)).toEqual([false, false]);
  });

  it('package ended = pending_renewal, expired', () => {
    expect(STUDENT_STATUSES.filter(isPackageEnded)).toEqual(['pending_renewal', 'expired']);
  });

  it('a payment activates every status but active, paused and churned', () => {
    expect(STUDENT_STATUSES.filter(isActivating)).toEqual([...ACTIVATING_STATUSES]);
    expect(['active', 'paused', 'churned', null].map((s) => isActivating(s as StudentStatus | null))).toEqual([false, false, false, false]);
  });
});

describe('registration and the trial lesson', () => {
  it('registers with a trial lesson as trial, without as new', () => {
    expect([true, false].map(registrationStatus)).toEqual(['trial', 'new']);
  });

  it('booking a trial lesson moves new → trial', () => {
    expect(trialMove('new', { open: true, attended: false, paid: false })).toEqual({ from: 'new', to: 'trial', reason: 'trial_booked' });
    expect(trialMove('trial', { open: true, attended: false, paid: false })).toBeNull();
  });

  it('attending (completed / late) moves new or trial → pending_subscription', () => {
    for (const s of ['new', 'trial'] as const)
      expect(trialMove(s, { open: false, attended: true, paid: false })).toEqual({ from: s, to: 'pending_subscription', reason: 'trial_attended' });
    expect(trialMove('trial', { open: true, attended: true, paid: false })?.to).toBe('pending_subscription');
  });

  it('attended but already paid (owner 2026-10-15) → no move, open or not', () => {
    for (const s of ['new', 'trial'] as const) for (const open of [true, false])
      expect(trialMove(s, { open, attended: true, paid: true })).toBeNull();
    expect(trialMove('new', { open: true, attended: false, paid: true })?.to).toBe('trial');
  });

  it('a missed or cancelled trial with nothing else booked moves trial → new', () => {
    expect(trialMove('trial', { open: false, attended: false, paid: false })).toEqual({ from: 'trial', to: 'new', reason: 'trial_missed' });
    expect(trialMove('new', { open: false, attended: false, paid: false })).toBeNull();
  });

  it('never touches any other status (a manual status wins)', () => {
    const others = STUDENT_STATUSES.filter((s) => s !== 'new' && s !== 'trial');
    for (const s of others) for (const open of [true, false]) for (const attended of [true, false])
      expect(trialMove(s, { open, attended, paid: false })).toBeNull();
  });
});

describe('payments', () => {
  it('moves every activating status to active with its from-status', () => {
    for (const s of ACTIVATING_STATUSES) expect(paymentMove(s)).toEqual({ from: s, to: 'active', reason: 'payment' });
    for (const s of ['active', 'paused', 'churned'] as const) expect(paymentMove(s)).toBeNull();
  });

  it('a deleted payment reverts active to the recorded from-status only', () => {
    expect(revertMove('active', 'pending_subscription')).toEqual({ from: 'active', to: 'pending_subscription', reason: 'payment_deleted' });
    expect(revertMove('active', 'expired')?.to).toBe('expired');
    expect(revertMove('paused', 'trial')).toBeNull();
    expect(revertMove('pending_renewal', 'trial')).toBeNull();
    expect(revertMove('active', 'active')).toBeNull();
    expect(revertMove('active', 'churned')).toBeNull();
  });
});
