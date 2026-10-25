import { canOpen } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import type { TabItem } from '@/core/ui/layout/AppNativeTabs';

/**
 * The salesperson's bottom tabs, in the web SalesNav order with its gates: «المحادثات» (inbox.read,
 * the unread badge), «الطلاب» and «جدول الحلقات» (self.sales_academy), «المزيد» always (teachers,
 * running lessons, subscriptions, earnings, sign-out). The first tab sits at the inline-start.
 */
export const salesTabItems = (can: Can, inboxBadge?: string): TabItem[] => [
  { name: 'inbox', title: t.sales.nav.chats, icon: 'inbox', hidden: !canOpen(can, 'inbox'), badge: inboxBadge },
  { name: 'students', title: t.sales.nav.allStudents, icon: 'students', hidden: !canOpen(can, 'salesStudents') },
  { name: 'schedule', title: t.sales.nav.academySchedule, icon: 'schedule', hidden: !canOpen(can, 'salesSchedule') },
  { name: 'more', title: t.mobile.more, icon: 'more' },
];
