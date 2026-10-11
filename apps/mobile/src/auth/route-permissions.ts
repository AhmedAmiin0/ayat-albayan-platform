import type { Permission } from '@ab/shared';
import type { Can } from './use-permissions';

/**
 * The permission each mobile screen needs, mirroring ADMIN_PAGES / admin-nav-items on the web.
 * Tab and «المزيد» row keys, not URLs: one table for tabs, rows and tests.
 */
export const ROUTE_PERMISSION = {
  today: 'lessons.read',
  schedule: 'lessons.read',
  inbox: 'inbox.read',
  students: 'students.read',
  receivables: 'receivables.read',
  subscriptions: 'subscriptions.read',
  payments: 'payments.read',
  payouts: 'payouts.read',
  expenses: 'expenses.read',
  invoices: 'invoices.read',
  summary: 'dashboard.read',
  dashboard: 'dashboard.read',
  settings: 'settings.read',
  activity: 'activity.read',
  chats: 'inbox.read',
  // The salesperson's pages (docs/16), the web's SALES_NAV_ITEMS keys: base-role scopes, never grantable.
  salesSubscriptions: 'self.sales',
  salesTeachers: 'self.sales_academy',
  salesStudents: 'self.sales_academy',
  salesLive: 'self.sales_academy',
  salesSchedule: 'self.sales_academy',
} as const satisfies Record<string, Permission>;

export type RouteKey = keyof typeof ROUTE_PERMISSION;

/** May the held role open this screen? (`can` hides nothing while /auth/me is still loading.) */
export function canOpen(can: Can, route: RouteKey): boolean {
  return can(ROUTE_PERMISSION[route]);
}

export type TabRoute = 'today' | 'schedule' | 'inbox' | 'students';

/** Is this bottom tab in the bar? The Inbox tab also hosts the leads list, so leads.read keeps it. */
export function tabOpen(can: Can, tab: TabRoute): boolean {
  return tab === 'inbox' ? canOpen(can, 'inbox') || can('leads.read') : canOpen(can, tab);
}

/** The rows `can` allows; a section whose list comes back empty is not drawn at all. */
export function allowedRows<R extends { route: RouteKey }>(can: Can, rows: readonly R[]): R[] {
  return rows.filter((row) => canOpen(can, row.route));
}
