import type { Permission } from '@ab/catalog';
import { SectionLinks, type SectionLink } from '@/components/shell/nav/SectionLinks';
import { t } from '@ab/web-kit';

// Each own-data page has its scope key; the assistant side (docs/16) has self.sales_academy.
export const SALES_NAV_ITEMS = [
  { to: '/sales/inbox', label: t.sales.nav.chats, icon: 'chat', permission: 'inbox.read' },
  { to: '/sales/students', label: t.sales.nav.allStudents, icon: 'users', permission: 'self.sales_academy' },
  { to: '/sales/teachers', label: t.sales.nav.teachers, icon: 'teacher', permission: 'self.sales_academy' },
  { to: '/sales/live', label: t.sales.nav.live, icon: 'clock', permission: 'self.sales_academy' },
  { to: '/sales/schedule', label: t.sales.nav.academySchedule, icon: 'calendar', permission: 'self.sales_academy' },
  { to: '/sales/subscriptions', label: t.sales.nav.subscriptions, icon: 'receipt', permission: 'self.sales' },
  { to: '/sales/templates', label: t.templates.author.nav, icon: 'template', permission: 'templates.author' },
  { to: '/sales/short-links', label: t.nav.shortLinks, icon: 'link', permission: 'short_links.manage' },
  { to: '/sales/meetings', label: t.meetingInvites.list.title, icon: 'calendar', permission: 'meetings.read' },
  { to: '/sales/earnings', label: t.assistantPortal.nav.earnings, icon: 'wallet', permission: 'self.sales_earnings' },
] as const satisfies readonly SectionLink[];

export interface SalesNavProps {
  can?: (permission: Permission) => boolean;
  unread?: number;
}

/** A row of links from 900px, a menu sheet below (like TeacherNav). */
export function SalesNav({ can, unread = 0 }: SalesNavProps) {
  const count = unread > 0 ? t.nav.unread.replace('{n}', String(unread)) : undefined;
  const items = SALES_NAV_ITEMS.map((item) => (item.to === '/sales/inbox' ? { ...item, count } : item));
  return <SectionLinks label={t.sales.nav.label} items={items} can={can} />;
}
