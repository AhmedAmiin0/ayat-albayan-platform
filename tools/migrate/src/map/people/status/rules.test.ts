// Pure status rules (owner 2026-10-27): periods, the expiry window and the decision table.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPIRY_DAYS,
  bestPayment,
  importedStatus,
  paymentState,
  periodEnd,
} from './rules.ts';

const state = (startsOn: string, expiryDays = DEFAULT_EXPIRY_DAYS) =>
  paymentState({ startsOn, today: '2026-10-27', expiryDays });

describe('periodEnd', () => {
  it('is one month after the start, clamped to the month end', () => {
    expect(periodEnd('2026-09-15')).toBe('2026-10-15');
    expect(periodEnd('2026-01-31')).toBe('2026-02-28');
    expect(periodEnd('2026-12-10')).toBe('2027-01-10');
  });
});

describe('paymentState', () => {
  it('current while the period covers the import date, or starts later', () => {
    expect(DEFAULT_EXPIRY_DAYS).toBe(7);
    expect(state('2026-10-01')).toBe('current');
    expect(state('2026-09-28')).toBe('current'); // ends 10-28, after the import date
    expect(state('2026-11-01')).toBe('current');
  });

  it('grace for less than subscription_expiry_days after the end, then ended', () => {
    expect(state('2026-09-27')).toBe('grace'); // ended today
    expect(state('2026-09-21')).toBe('grace'); // 6 days ago
    expect(state('2026-09-20')).toBe('ended'); // 7 days ago: the app's expired
    expect(state('2026-09-20', 30)).toBe('grace');
  });
});

describe('bestPayment', () => {
  it('keeps the better state', () => {
    expect(bestPayment(undefined, 'ended')).toBe('ended');
    expect(bestPayment('ended', 'current')).toBe('current');
    expect(bestPayment('current', 'grace')).toBe('current');
  });
});

describe('importedStatus', () => {
  const none = { payment: null, series: false, attended: false } as const;
  it('active only with a current payment or a running series', () => {
    expect(importedStatus({ ...none, payment: 'current' })).toBe('active');
    expect(importedStatus({ ...none, series: true })).toBe('active');
    expect(importedStatus({ ...none, payment: 'ended', series: true })).toBe('active');
  });

  it('past payments: pending_renewal within the window, else expired (attended or not)', () => {
    expect(importedStatus({ ...none, payment: 'grace', attended: true })).toBe('pending_renewal');
    expect(importedStatus({ ...none, payment: 'ended', attended: true })).toBe('expired');
  });

  it('never paid: attended → pending_subscription, else new', () => {
    expect(importedStatus({ ...none, attended: true })).toBe('pending_subscription');
    expect(importedStatus(none)).toBe('new');
  });
});
