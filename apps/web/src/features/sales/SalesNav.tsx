import type { Permission } from '@ab/shared';
import { SectionLinks, type SectionLink } from '@/components/shell/SectionLinks';
import { t } from '@/lib/i18n';

// The salesperson's pages (base role sales, shown «المبيعات»): chats (where a new student is registered),
// students («طلابي» is a filter inside), teachers, running lessons, the academy's schedule (read-only),
// subscriptions, my earnings («مدفوعاتي» is a filter inside; owner 2026-10-12: no meetings page). Each
// own-data page has its scope key; the assistant side (docs/16) has self.sales_academy.
export const SALES_NAV_ITEMS = [
  { to: '/sales/inbox', label: t.sales.nav.chats, icon: 'chat', permission: 'inbox.read' },
  { to: '/sales/students', label: t.sales.nav.allStudents, icon: 'users', permission: 'self.sales_academy' },
  { to: '/sales/teachers', label: t.sales.nav.teachers, icon: 'teacher', permission: 'self.sales_academy' },
  { to: '/sales/live', label: t.sales.nav.live, icon: 'clock', permission: 'self.sales_academy' },
  { to: '/sales/schedule', label: t.sales.nav.academySchedule, icon: 'calendar', permission: 'self.sales_academy' },
  { to: '/sales/subscriptions', label: t.sales.nav.subscriptions, icon: 'receipt', permission: 'self.sales' },
  { to: '/sales/earnings', label: t.assistantPortal.nav.earnings, icon: 'wallet', permission: 'self.sales_earnings' },
] as const satisfies readonly SectionLink[];

/** The salesperson's nav: a row of links from 900px, the «القائمة» sheet below (like TeacherNav). */
export function SalesNav({ can }: { can?: (permission: Permission) => boolean }) {
  return <SectionLinks label={t.sales.nav.label} items={SALES_NAV_ITEMS} can={can} />;
}
