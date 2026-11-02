import { describe, expect, it } from 'vitest';
import type { SubscriptionStatus } from '@ab/catalog';
import {
  ALERT_TASK_KIND,
  alertDedupKey,
  alertFor,
  studentRemaining,
  subscriptionStatusFor,
  type StatusInput,
} from './alerts.js';

describe('alertFor (R-SUB-02: 2 left → renewal, 0 → unpaid)', () => {
  const rows: [number, number, SubscriptionStatus | undefined, ReturnType<typeof alertFor>][] = [
    [5, 2, 'active', null],
    [3, 2, 'active', null],
    [2, 2, 'active', 'renewal'],
    [1, 2, 'active', 'renewal'], // two lessons closed at once skipped "2": still alerts
    [0, 2, 'active', 'unpaid'],
    [-1, 2, 'unpaid', 'unpaid'], // attended past the package
    [2, 2, 'unpaid', 'renewal'], // new package not paid yet still gets the reminder
    [2, 3, undefined, 'renewal'],
    [3, 3, 'active', 'renewal'],
    [1, 0, 'active', null], // threshold 0: only the unpaid alert
    [0, 0, 'active', 'unpaid'],
    [0, 2, 'paused', null],
    [1, 2, 'trial', null],
    [0, 2, 'cancelled', null],
  ];
  const cases = rows.map(([remaining, threshold, status, expected]) => ({ remaining, threshold, status, expected }));
  it.each(cases)('remaining $remaining, threshold $threshold, $status → $expected', (c) => {
    const status = c.status ? { status: c.status } : {};
    expect(alertFor({ remaining: c.remaining, threshold: c.threshold, ...status })).toBe(c.expected);
  });
});

describe('dedup keys (rule 8): one task and one message per alert per package', () => {
  it('renewal_due:{id} and subscription_unpaid:{id}', () => {
    expect(alertDedupKey('renewal', 'sub-1')).toBe('renewal_due:sub-1');
    expect(alertDedupKey('unpaid', 'sub-1')).toBe('subscription_unpaid:sub-1');
    expect(ALERT_TASK_KIND).toEqual({ renewal: 'renewal_due', unpaid: 'subscription_unpaid' });
  });
});

describe('studentRemaining: an early renewal silences the alert', () => {
  it('sums every package', () => {
    expect(studentRemaining([{ remaining: 0 }, { remaining: 8 }])).toBe(8);
    expect(studentRemaining([{ remaining: 0 }, { remaining: -2 }])).toBe(-2);
    expect(studentRemaining([])).toBe(0);
  });
});

describe('subscriptionStatusFor (R-SUB-01/02, journey 3: payment → active)', () => {
  const base: StatusInput = { current: 'unpaid', paid: 120, price: 120, remaining: 3, superseded: false };
  it.each<[string, Partial<StatusInput>, SubscriptionStatus]>([
    ['paid in full, lessons left → active', {}, 'active'],
    ['nothing paid yet → unpaid', { paid: 0 }, 'unpaid'],
    ['part paid → unpaid', { paid: 60 }, 'unpaid'],
    ['overpaid → active', { paid: 150 }, 'active'],
    ['a free package (price 0) → active', { paid: 0, price: 0 }, 'active'],
    ['used up, no renewal → unpaid', { remaining: 0 }, 'unpaid'],
    ['used up, a newer package took over → expired', { remaining: 0, superseded: true }, 'expired'],
    ['used up and still owed → unpaid', { remaining: 0, superseded: true, paid: 0 }, 'unpaid'],
    ['paused stays paused', { current: 'paused', paid: 0 }, 'paused'],
    ['trial stays trial', { current: 'trial' }, 'trial'],
    ['cancelled stays cancelled (never resurrected)', { current: 'cancelled', paid: 0, price: 0, remaining: 8 }, 'cancelled'],
    ['cancelled stays cancelled even with nothing left', { current: 'cancelled', remaining: 0, superseded: true }, 'cancelled'],
    ['active → expired when superseded', { current: 'active', remaining: -1, superseded: true }, 'expired'],
  ])('%s', (_name, patch, expected) => {
    expect(subscriptionStatusFor({ ...base, ...patch })).toBe(expected);
  });
});
