import type { Href } from 'expo-router';
import { type TreeBase, useTreeBase } from '@/core/nav/tree-base';

/**
 * Where the salesperson's pages live in each tree. Admins and teachers holding the sales double role
 * reach them under «المزيد» › «المبيعات» (/more/sales/…); the sales tree (base role sales) has the
 * schedule as a tab and the rest under its own «المزيد» (/sales/more/…).
 */
export function salesHrefs(base: TreeBase) {
  const more = base === '/sales' ? '/sales/more' : '/more/sales';
  return {
    teacher: (id: string): Href => `${more}/teachers/${id}` as Href,
    history: (subscriptionId: string): Href => `${more}/history/${subscriptionId}` as Href,
    schedule: (teacherId: string): Href => ({
      pathname: base === '/sales' ? '/sales/schedule' : '/more/sales/schedule',
      params: { teacherId },
    }),
  };
}

export const useSalesHrefs = () => salesHrefs(useTreeBase());
