import { Tabs } from 'expo-router';
import { ThreadModeProvider } from '@/inbox/thread-mode';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { NotLinkedScreen } from './NotLinkedScreen';
import { isNotLinked, useTeacherMe } from './queries';
import { TeacherTabIcon, type TeacherTabIconName } from './TeacherTabIcon';

// The teacher app (R-AUTH-01, R-TCH-03, R-MOB-02): only her lessons, schedule, chats, students,
// reports and payouts. The first tab sits at the inline-start (right in Arabic), as in the admin tabs.
const tabItems = (): { name: string; title: string; icon: TeacherTabIconName }[] => [
  { name: 'today', title: t.teacherNav.today, icon: 'today' },
  { name: 'schedule', title: t.teacherNav.calendar, icon: 'schedule' },
  { name: 'chats', title: t.nav.conversations, icon: 'inbox' },
  { name: 'students', title: t.teacherNav.students, icon: 'students' },
  { name: 'reports', title: t.teacherNav.reports, icon: 'reports' },
  { name: 'more', title: t.mobile.more, icon: 'more' },
];

/**
 * Teacher tabs. The shared chat screens run in teacher mode (her threads, no admin actions). A login
 * with no teachers row (404 `teacher_not_linked`) gets one screen that says so, and sign-out.
 * No push registration: pushes go to admins only (API /me/push-tokens is admin-only).
 */
export function TeacherTabs() {
  const { color } = useTheme();
  const me = useTeacherMe();
  if (!me.data && isNotLinked(me.error)) return <NotLinkedScreen />;
  return (
    <ThreadModeProvider value={{ kind: 'teacher', teacherId: me.data?.id ?? '' }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: color.lapis,
          tabBarInactiveTintColor: color.ink3,
          tabBarStyle: { backgroundColor: color.raised, borderTopColor: color.rule },
          tabBarLabelStyle: { fontFamily: type.ui[600], fontSize: type.size['2xs'] },
          sceneStyle: { backgroundColor: color.margin },
        }}
      >
        {tabItems().map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              tabBarAccessibilityLabel: tab.title,
              tabBarIcon: ({ color: tint }) => <TeacherTabIcon name={tab.icon} color={tint} />,
            }}
          />
        ))}
      </Tabs>
    </ThreadModeProvider>
  );
}
