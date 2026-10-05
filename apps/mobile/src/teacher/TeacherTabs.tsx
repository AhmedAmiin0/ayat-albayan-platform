import { ThreadModeProvider } from '@/inbox/thread-mode';
import { t } from '@/lib/i18n';
import { AppNativeTabs, type TabItem } from '@/ui/AppNativeTabs';
import { NotLinkedScreen } from './NotLinkedScreen';
import { isNotLinked, useTeacherMe } from './queries';

// The teacher app, native tabs (R-AUTH-01, R-TCH-03, R-MOB-02): only her lessons, schedule, chats, students,
// reports and payouts. Five tabs, the native bar's limit on Android; «الطلاب» lives in «المزيد».
// The first tab sits at the inline-start (right in Arabic), as in the admin tabs.
const tabItems = (): TabItem[] => [
  { name: 'today', title: t.teacherNav.today, icon: 'today' },
  { name: 'schedule', title: t.teacherNav.calendar, icon: 'teacherSchedule' },
  { name: 'chats', title: t.nav.conversations, icon: 'inbox' },
  { name: 'reports', title: t.teacherNav.reports, icon: 'reports' },
  { name: 'more', title: t.mobile.more, icon: 'more' },
];

/**
 * Teacher tabs. The shared chat screens run in teacher mode (her threads, no admin actions). A login
 * with no teachers row (404 `teacher_not_linked`) gets one screen that says so, and sign-out.
 * No push registration: pushes go to admins only (API /me/push-tokens is admin-only).
 */
export function TeacherTabs() {
  const me = useTeacherMe();
  if (!me.data && isNotLinked(me.error)) return <NotLinkedScreen />;
  return (
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: me.data?.id ?? '' }}>
      <AppNativeTabs tabs={tabItems()} />
    </ThreadModeProvider>
  );
}
