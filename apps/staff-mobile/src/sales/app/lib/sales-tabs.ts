import { canOpen } from '@/core/auth/route-permissions';
import { t, type TabItem } from '@ab/mobile-kit';
import type { Can } from '@ab/mobile-kit';

/** Tabs follow the web SalesNav order and gates; the first visible tab is where she lands. */
export const salesTabItems = (can: Can, inboxBadge?: string): TabItem[] => [
  { name: 'today', title: t.mobile.today, icon: 'today', hidden: !canOpen(can, 'salesSchedule') },
  { name: 'inbox', title: t.sales.nav.chats, icon: 'inbox', hidden: !canOpen(can, 'inbox'), badge: inboxBadge },
  { name: 'students', title: t.sales.nav.allStudents, icon: 'students', hidden: !canOpen(can, 'salesStudents') },
  { name: 'schedule', title: t.sales.nav.scheduleTab, icon: 'schedule', hidden: !canOpen(can, 'salesSchedule') },
  { name: 'more', title: t.mobile.more, icon: 'more' },
];
