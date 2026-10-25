import { tabOpen } from '@/auth/route-permissions';
import { type Can, usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { useInboxBadge } from '@/core/nav/use-inbox-badge';
import { usePushRegistration } from '@/core/push/usePushRegistration';
import { AppNativeTabs, type TabItem } from '@/core/ui/layout/AppNativeTabs';

// docs/07 §12 bottom tabs, native. The first tab sits at the inline-start (right in Arabic). A tab the held
// role cannot read is hidden (`can` allows all while /auth/me loads: no flicker); المحادثات carries the
// unread + new-leads count (R-MOB-02). «المزيد» is always there (sign-out, language).
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
  return <AppNativeTabs tabs={tabItems(can, badge)} />;
}
