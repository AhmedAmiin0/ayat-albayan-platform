import { canOpen } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import type { TabItem } from '@/core/ui/layout/AppNativeTabs';

/**
 * The salesperson's bottom tabs, in the web SalesNav order with its gates, after the calm «اليوم»
 * (owner 2026-10-27; gated as «جدول الحلقات», whose day it shows): «المحادثات» (inbox.read, the
 * unread badge), «الطلاب» and «جدول الحلقات» (self.sales_academy), «المزيد» always (teachers,
 * running lessons, subscriptions, earnings, sign-out). The first tab sits at the inline-start and is
 * where she lands (sign-in, app open): «اليوم», else «المحادثات». Tab titles are one short word («الجدول»).
 */
export const salesTabItems = (can: Can, inboxBadge?: string): TabItem[] => [
  { name: 'today', title: t.mobile.today, icon: 'today', hidden: !canOpen(can, 'salesSchedule') },
  { name: 'inbox', title: t.sales.nav.chats, icon: 'inbox', hidden: !canOpen(can, 'inbox'), badge: inboxBadge },
  { name: 'students', title: t.sales.nav.allStudents, icon: 'students', hidden: !canOpen(can, 'salesStudents') },
  { name: 'schedule', title: t.sales.nav.scheduleTab, icon: 'schedule', hidden: !canOpen(can, 'salesSchedule') },
  { name: 'more', title: t.mobile.more, icon: 'more' },
];
