import { describe, expect, it } from 'vitest';
import { expiryMove, type StatusExpiryInput } from './status-flow.js';

const NOW = new Date('2026-10-15T09:00:00Z');
const base: StatusExpiryInput = { current: 'pending_renewal', since: '2026-10-08T09:00:00Z', now: NOW, days: 7, paidSince: false };

describe('expiryMove: pending_renewal for N days → expired', () => {
  it('expires exactly N days after the move to pending_renewal', () => {
    expect(expiryMove(base)).toEqual({ from: 'pending_renewal', to: 'expired', reason: 'subscription_expired' });
    expect(expiryMove({ ...base, since: '2026-10-08T09:00:01Z' })).toBeNull();
  });

  it('reads the setting (1..90 days)', () => {
    expect(expiryMove({ ...base, days: 8 })).toBeNull();
    expect(expiryMove({ ...base, days: 1, since: '2026-10-14T08:59:00Z' })?.to).toBe('expired');
  });

  it('a positive payment since then keeps it', () => {
    expect(expiryMove({ ...base, paidSince: true })).toBeNull();
  });

  it('only from pending_renewal, and only with a known start', () => {
    for (const current of ['active', 'expired', 'paused', 'churned', 'trial'] as const)
      expect(expiryMove({ ...base, current })).toBeNull();
    expect(expiryMove({ ...base, since: null })).toBeNull();
    expect(expiryMove({ ...base, since: 'not a date' })).toBeNull();
  });
});
