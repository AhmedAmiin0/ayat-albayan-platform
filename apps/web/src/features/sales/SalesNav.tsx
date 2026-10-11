import type { Permission } from '@ab/shared';
import { SectionLinks, type SectionLink } from '@/components/shell/SectionLinks';
import { t } from '@/lib/i18n';

// The assistant's pages (base role sales, shown «المبيعات»): chats, registering a student, my students,
// subscriptions, meetings, my payments, my earnings. Each own-data page has its scope key.
export const SALES_NAV_ITEMS = [
  { to: '/sales/inbox', label: t.sales.nav.chats, icon: 'chat', permission: 'inbox.read' },
  { to: '/sales/register', label: t.assistantPortal.nav.register, icon: 'plus', permission: 'self.sales' },
  { to: '/sales/students', label: t.assistantPortal.nav.students, icon: 'users', permission: 'self.sales_students' },
  { to: '/sales/subscriptions', label: t.sales.nav.subscriptions, icon: 'receipt', permission: 'self.sales' },
  { to: '/sales/meetings', label: t.sales.nav.schedule, icon: 'calendar', permission: 'self.sales' },
  { to: '/sales/payments', label: t.assistantPortal.nav.payments, icon: 'card', permission: 'self.sales_payments' },
  { to: '/sales/earnings', label: t.assistantPortal.nav.earnings, icon: 'wallet', permission: 'self.sales_earnings' },
] as const satisfies readonly SectionLink[];

/** The salesperson's nav: a row of links from 900px, the «القائمة» sheet below (like TeacherNav). */
export function SalesNav({ can }: { can?: (permission: Permission) => boolean }) {
  return <SectionLinks label={t.sales.nav.label} items={SALES_NAV_ITEMS} can={can} />;
}
