import type { Permission } from '@ab/shared';
import { canDo, type Me } from './me';

// Which permission each /admin page needs (dynamic roles, 2026-10-05). The base role still decides
// who gets /admin at all (requireRole('admin')); inside, a custom role (e.g. «محاسب» with
// payments.read only) reaches only the pages its permissions open. Longest prefix wins.
export const ADMIN_PAGES: readonly (readonly [prefix: string, permission: Permission])[] = [
  ['/admin/leads', 'leads.read'],
  ['/admin/inbox', 'inbox.read'],
  ['/admin/job-applicants', 'applicants.read'],
  ['/admin/students', 'students.read'],
  ['/admin/teachers', 'teachers.read'],
  ['/admin/schedule', 'lessons.read'],
  ['/admin/book', 'booking.write'],
  ['/admin/classrooms', 'lessons.read'],
  ['/admin/feedback', 'feedback.read'],
  ['/admin/payments', 'payments.read'],
  ['/admin/subscriptions', 'subscriptions.read'],
  ['/admin/payouts', 'payouts.read'],
  ['/admin/expenses', 'expenses.read'],
  ['/admin/invoices', 'invoices.read'],
  ['/admin/receivables', 'receivables.read'],
  ['/admin/finance', 'dashboard.read'],
  ['/admin/pricing', 'pricing.read'],
  ['/admin/settings', 'settings.read'],
  ['/admin/activity', 'activity.read'],
  ['/admin/roles', 'roles.manage'],
];

/** The /admin home is the dashboard. */
const HOME: Permission = 'dashboard.read';

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** The permission a path under /admin needs; the home needs dashboard.read. */
export function pagePermission(pathname: string): Permission | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/admin') return HOME;
  const hits = ADMIN_PAGES.filter(([prefix]) => matches(path, prefix));
  const best = hits.sort((a, b) => b[0].length - a[0].length)[0];
  return best ? best[1] : null;
}

/** The first page this user may open: the dashboard, else the first page in ADMIN_PAGES. */
export function firstAllowedPage(me: Me | null): string | null {
  if (canDo(me, HOME)) return '/admin';
  return ADMIN_PAGES.find(([, p]) => canDo(me, p))?.[0] ?? null;
}

/**
 * For the /admin layout's beforeLoad: null when `pathname` may be shown, else where to go
 * instead (the first allowed page, or /login when there is none).
 */
export function adminRedirect(me: Me | null, pathname: string): string | null {
  const needed = pagePermission(pathname);
  if (!needed || canDo(me, needed)) return null;
  return firstAllowedPage(me) ?? '/login';
}
