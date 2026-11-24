import { CrashScreen, type Can, usePermissions, t, AppNativeTabs, type TabItem } from '@ab/mobile-kit';
import { canOpen, tabOpen } from '@/core/auth';
import { useInboxBadge } from '@/core/nav/use-inbox-badge';
import { usePushRegistration } from '@/core/push/usePushRegistration';
import { useInboxRealtime } from '@/inbox';

// docs/07 §12: unreadable tabs are hidden; all allowed while /auth/me loads (R-MOB-02).
const tabItems = (can: Can, inboxBadge?: string): TabItem[] => [
  { name: 'index', title: t.mobile.today, icon: 'today', hidden: !tabOpen(can, 'today') },
  { name: 'schedule', title: t.schedule.nav, icon: 'schedule', hidden: !tabOpen(can, 'schedule') },
  { name: 'inbox', title: t.nav.conversations, icon: 'inbox', hidden: !tabOpen(can, 'inbox'), badge: inboxBadge },
  { name: 'students', title: t.nav.students, icon: 'students', hidden: !tabOpen(can, 'students') },
  { name: 'more', title: t.mobile.more, icon: 'more' },
];

export default function TabsLayout() {
  // Admin tree: every sign-in and cold start registers this device (R-MOB-01).
  usePushRegistration('admin');
  const can = usePermissions();
  const badge = useInboxBadge(can);
  // The inbox live while the app is open (docs/12 §15); push when it is closed.
  useInboxRealtime(canOpen(can, 'inbox'));
  return <AppNativeTabs tabs={tabItems(can, badge)} />;
}

export const ErrorBoundary = CrashScreen;
