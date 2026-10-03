import { t } from '@/lib/i18n';
import { usePushRegistration } from '@/push/usePushRegistration';
import { AppNativeTabs, type TabItem } from '@/ui/AppNativeTabs';

// docs/07 §12 bottom tabs, native. The first tab sits at the inline-start (right in Arabic). No badges until an
// API returns a real count: TODO(R-MOB-02) المحادثات gets the saffron «جديد» count from /leads.
const tabItems = (): TabItem[] => [
  { name: 'index', title: t.mobile.today, icon: 'today' },
  { name: 'schedule', title: t.schedule.nav, icon: 'schedule' },
  { name: 'inbox', title: t.nav.conversations, icon: 'inbox' },
  { name: 'students', title: t.nav.students, icon: 'students' },
  { name: 'more', title: t.mobile.more, icon: 'more' },
];

export default function TabsLayout() {
  // Admin-only tree: every sign-in and cold start registers this device (R-MOB-01).
  usePushRegistration();
  return <AppNativeTabs tabs={tabItems()} />;
}
