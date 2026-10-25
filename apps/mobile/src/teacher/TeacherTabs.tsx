import { canOpen } from '@/auth/route-permissions';
import { type Can, usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { AppNativeTabs, type TabItem } from '@/core/ui/layout/AppNativeTabs';
import { TeacherScope } from './TeacherScope';

// The teacher app, native tabs (R-AUTH-01, R-TCH-03, R-MOB-02): only her lessons, schedule, chats, students,
// reports and payouts. Five tabs, the native bar's limit on Android; «الطلاب» lives in «المزيد».
// The first tab sits at the inline-start (right in Arabic), as in the admin tabs. «المحادثات» hides without inbox.read.
const tabItems = (can: Can): TabItem[] => [
  { name: 'today', title: t.teacherNav.today, icon: 'today' },
  { name: 'schedule', title: t.teacherNav.calendar, icon: 'teacherSchedule' },
  { name: 'chats', title: t.nav.conversations, icon: 'inbox', hidden: !canOpen(can, 'chats') },
  { name: 'reports', title: t.teacherNav.reports, icon: 'reports' },
  { name: 'more', title: t.mobile.more, icon: 'more' },
];

/**
 * Teacher tabs, inside TeacherScope (teacher mode, the not-linked screen); an open chat is a full
 * screen above them (app/(teacher-chat)). Push registration is mounted by app/teacher/_layout.tsx
 * (teachers hold notifications.push).
 */
export function TeacherTabs() {
  const can = usePermissions();
  return (
    <TeacherScope>
      <AppNativeTabs tabs={tabItems(can)} />
    </TeacherScope>
  );
}
