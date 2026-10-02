import { Tabs } from 'expo-router';
import { t } from '@/lib/i18n';
import { usePushRegistration } from '@/push/usePushRegistration';
import { type, useTheme } from '@/theme';
import { TabIcon, type TabIconName } from '@/ui/TabIcon';

// docs/07 §12 bottom tabs. The first tab sits at the inline-start (right in Arabic). No badges until an
// API returns a real count: TODO(R-MOB-02) المحادثات gets the saffron «جديد» count from /leads.
const tabItems = (): { name: string; title: string; icon: TabIconName }[] => [
  { name: 'index', title: t.mobile.today, icon: 'today' },
  { name: 'inbox', title: t.nav.conversations, icon: 'inbox' },
  { name: 'students', title: t.nav.students, icon: 'students' },
  { name: 'more', title: t.mobile.more, icon: 'more' },
];

export default function TabsLayout() {
  const { color } = useTheme();
  // Admin-only tree: every sign-in and cold start registers this device (R-MOB-01).
  usePushRegistration();
  return (
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
            tabBarIcon: ({ color: tint }) => <TabIcon name={tab.icon} color={tint} />,
          }}
        />
      ))}
    </Tabs>
  );
}
