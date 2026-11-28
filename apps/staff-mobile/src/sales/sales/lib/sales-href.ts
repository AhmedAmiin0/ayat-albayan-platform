import type { Href } from 'expo-router';
import { inTree, type TreeBase, useTreeBase } from '@/core/nav/tree-base';
import { threadHref } from '@/inbox';

/** Double-role users reach these under /more/sales; the sales tree under /sales/more. */
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

/** A family's chat in the page's tree (/sales/inbox/… or the admin's /inbox/…). */
export const familyChatHref = (base: TreeBase, phone: string): Href =>
  inTree(base, threadHref(phone));

export const useSalesHrefs = () => salesHrefs(useTreeBase());
