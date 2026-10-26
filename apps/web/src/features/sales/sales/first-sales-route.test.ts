import type { Permission } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { firstSalesRoute, SALES_FALLBACK } from './first-sales-route';

vi.mock('@tanstack/react-router', () => ({ Link: () => null }));

const holding = (...held: Permission[]) => (p: Permission) => held.includes(p);

describe('firstSalesRoute (/sales landing)', () => {
  it('the default role lands on the chats', () => {
    expect(firstSalesRoute(holding('inbox.read', 'self.sales_academy', 'self.sales'))).toBe('/sales/inbox');
  });

  it('without inbox.read: the next allowed nav item, in nav order', () => {
    expect(firstSalesRoute(holding('self.sales_academy', 'self.sales_earnings'))).toBe('/sales/students');
    expect(firstSalesRoute(holding('self.sales_earnings', 'meetings.read'))).toBe('/sales/meetings');
    expect(firstSalesRoute(holding('self.sales_earnings'))).toBe('/sales/earnings');
  });

  it('nothing open: «حسابي»', () => {
    expect(firstSalesRoute(holding())).toBe(SALES_FALLBACK);
  });
});
