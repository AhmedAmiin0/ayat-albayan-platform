import { describe, expect, it } from 'vitest';
import { commissionKindOf, type OrderFact } from './kind.js';

// Twin of subscription_commission_kind after migration 934 (owner 2026-10-28).
describe('commissionKindOf: a cancelled package', () => {
  const mistake: OrderFact = { id: 'x', price: 145, created_at: '2026-10-28T09:00:00Z', status: 'cancelled' };
  const right: OrderFact = { id: 'b', price: 145, created_at: '2026-10-28T09:02:00Z', status: 'unpaid' };
  const subs = [mistake, right];
  it('made by mistake two minutes before the right one: the right one stays the first, the mistake is no kind', () => {
    expect(commissionKindOf(subs, 'b')).toBe('first');
    expect(commissionKindOf(subs, 'x')).toBeNull();
  });
  it('a live earlier package still makes it a renewal', () => {
    expect(commissionKindOf([{ ...mistake, id: 'a', status: 'active' }, right], 'b')).toBe('renewal');
  });

  it('a stopped package (migration 991) keeps its kind and still makes a later one a renewal', () => {
    const stopped: OrderFact = { ...mistake, id: 'a', cancel_kind: 'stopped' };
    expect(commissionKindOf([stopped, right], 'a')).toBe('first');
    expect(commissionKindOf([stopped, right], 'b')).toBe('renewal');
  });
});
