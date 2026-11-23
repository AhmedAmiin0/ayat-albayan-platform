import { canOpen } from '@/core/auth/route-permissions';
import { type Can, usePermissions, t, AppNativeTabs, type TabItem } from '@ab/mobile-kit';
import { useTeacherPageOn } from '@/teacher/lib/teacher-pages';
import { TeacherScope } from '@/teacher/components/TeacherScope';

// Five tabs, Android's native bar limit; chats hide without inbox.read or with the switch off.
const tabItems = (can: Can, chatsOn: boolean): TabItem[] => [
  { name: 'today', title: t.teacherNav.today, icon: 'today' },
  { name: 'schedule', title: t.teacherNav.calendar, icon: 'teacherSchedule' },
  { name: 'chats', title: t.nav.conversations, icon: 'inbox', hidden: !(canOpen(can, 'chats') && chatsOn) },
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
  const pageOn = useTeacherPageOn();
  return (
    <TeacherScope>
      <AppNativeTabs tabs={tabItems(can, pageOn('chats'))} />
    </TeacherScope>
  );
}
