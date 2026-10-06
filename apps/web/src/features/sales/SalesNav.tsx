import type { Permission } from '@ab/shared';
import { SectionLinks, type SectionLink } from '@/components/shell/SectionLinks';
import { t } from '@/lib/i18n';

// The salesperson's three pages: chats, subscriptions, meetings.
export const SALES_NAV_ITEMS = [
  { to: '/sales/inbox', label: t.sales.nav.chats, icon: 'chat', permission: 'inbox.read' },
  { to: '/sales/subscriptions', label: t.sales.nav.subscriptions, icon: 'receipt', permission: 'self.sales' },
  { to: '/sales/meetings', label: t.sales.nav.schedule, icon: 'calendar', permission: 'self.sales' },
] as const satisfies readonly SectionLink[];

/** The salesperson's nav: a row of links from 900px, the «القائمة» sheet below (like TeacherNav). */
export function SalesNav({ can }: { can?: (permission: Permission) => boolean }) {
  return <SectionLinks label={t.sales.nav.label} items={SALES_NAV_ITEMS} can={can} />;
}
