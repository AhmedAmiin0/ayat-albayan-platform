import { canOpen } from '@/auth/route-permissions';
import { type Can, usePermissions } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import { useInboxBadge } from '@/nav/use-inbox-badge';
import { usePushRegistration } from '@/push/usePushRegistration';
import { AppNativeTabs, type TabItem } from '@/ui/AppNativeTabs';

// docs/07 §12 bottom tabs, native. The first tab sits at the inline-start (right in Arabic). A tab the held
// role cannot read is hidden (`can` allows all while /auth/me loads: no flicker); المحادثات carries the
// unread + new-leads count (R-MOB-02). «المزيد» is always there (sign-out, language).
const tabItems = (can: Can, inboxBadge?: string): TabItem[] => [
  { name: 'index', title: t.mobile.today, icon: 'today', hidden: !canOpen(can, 'today') },
  { name: 'schedule', title: t.schedule.nav, icon: 'schedule', hidden: !canOpen(can, 'schedule') },
  { name: 'inbox', title: t.nav.conversations, icon: 'inbox', hidden: !canOpen(can, 'inbox'), badge: inboxBadge },
  { name: 'students', title: t.nav.students, icon: 'students', hidden: !canOpen(can, 'students') },
  { name: 'more', title: t.mobile.more, icon: 'more' },
];

export default function TabsLayout() {
  // Admin-only tree: every sign-in and cold start registers this device (R-MOB-01).
  usePushRegistration();
  const can = usePermissions();
  const badge = useInboxBadge(can);
  return <AppNativeTabs tabs={tabItems(can, badge)} />;
}
