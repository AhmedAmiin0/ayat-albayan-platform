import { SectionLinks, type SectionLink } from '@/components/shell/SectionLinks';
import { t } from '@/lib/i18n';

// The salesperson's three pages: chats, subscriptions, meetings.
export const SALES_NAV_ITEMS = [
  { to: '/sales/inbox', label: t.sales.nav.chats, icon: 'chat' },
  { to: '/sales/subscriptions', label: t.sales.nav.subscriptions, icon: 'receipt' },
  { to: '/sales/meetings', label: t.sales.nav.schedule, icon: 'calendar' },
] as const satisfies readonly SectionLink[];

/** The salesperson's nav: a row of links from 900px, the «القائمة» sheet below (like TeacherNav). */
export function SalesNav() {
  return <SectionLinks label={t.sales.nav.label} items={SALES_NAV_ITEMS} />;
}
