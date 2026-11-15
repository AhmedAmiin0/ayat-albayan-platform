import type { Permission } from '@ab/shared';
import { SALES_NAV_ITEMS } from './SalesNav';

/** Where /sales lands when no nav page is open to the held role. */
export const SALES_FALLBACK = '/account';

/**
 * /sales lands on the first nav page the user's permissions open (the chats for the default sales
 * role), so an edited role without inbox.read never lands on a 403.
 */
export function firstSalesRoute(can: (permission: Permission) => boolean): string {
  return SALES_NAV_ITEMS.find((item) => can(item.permission))?.to ?? SALES_FALLBACK;
}
