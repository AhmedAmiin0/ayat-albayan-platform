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
} as const satisfies Record<string, Permission>;

export type RouteKey = keyof typeof ROUTE_PERMISSION;

/** May the held role open this screen? (`can` hides nothing while /auth/me is still loading.) */
export function canOpen(can: Can, route: RouteKey): boolean {
  return can(ROUTE_PERMISSION[route]);
}

/** The rows `can` allows; a section whose list comes back empty is not drawn at all. */
export function allowedRows<R extends { route: RouteKey }>(can: Can, rows: readonly R[]): R[] {
  return rows.filter((row) => canOpen(can, row.route));
}
