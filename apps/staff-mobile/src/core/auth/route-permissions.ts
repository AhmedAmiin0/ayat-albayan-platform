import type { Permission } from '@ab/catalog';
import type { Can } from '@ab/mobile-kit';

/** Mirrors the web's ADMIN_PAGES; keys are tab and row keys, not URLs. */
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
  // The salesperson's pages (docs/16), web SALES_NAV_ITEMS keys: base-role scopes, never grantable.
  salesSubscriptions: 'self.sales',
  salesTeachers: 'self.sales_academy',
  salesStudents: 'self.sales_academy',
  salesLive: 'self.sales_academy',
  salesSchedule: 'self.sales_academy',
  salesEarnings: 'self.sales_earnings',
  // Meetings for every staff role holding meetings.read.
  salesMeetings: 'meetings.read',
  // Sales team: the sales staff's terms, commissions and statements.
  assistants: 'assistantpay.read',
  // The classroom assistant's tree (web /assistant/): lessons they assist and internal meetings.
  assistantLessons: 'self.assistant',
  meetings: 'meetings.read',
  // Allow-list templates: sales by default and the admin.
  templates: 'templates.author',
  // docs/19: sales and the admin; short_links.all shows everyone's.
  shortLinks: 'short_links.manage',
} as const satisfies Record<string, Permission>;

export type RouteKey = keyof typeof ROUTE_PERMISSION;

/** May the held role open this screen? (`can` hides nothing while /auth/me is still loading.) */
export function canOpen(can: Can, route: RouteKey): boolean {
  return can(ROUTE_PERMISSION[route]);
}

export type TabRoute = 'today' | 'schedule' | 'inbox' | 'students';

/** The Inbox tab also hosts the leads list, so leads.read keeps it in the bar. */
export function tabOpen(can: Can, tab: TabRoute): boolean {
  return tab === 'inbox' ? canOpen(can, 'inbox') || can('leads.read') : canOpen(can, tab);
}

/** The rows `can` allows; a section whose list comes back empty is not drawn at all. */
export function allowedRows<R extends { route: RouteKey }>(can: Can, rows: readonly R[]): R[] {
  return rows.filter((row) => canOpen(can, row.route));
}
