import { Tabs } from 'expo-router/js-tabs';
import { useTheme } from '@/theme';
import { GlassTabBar } from './GlassTabBar';
import type { TabIconName } from './tab-icons';

export interface TabItem {
  /** The route segment of the tab (folder or file under the layout). */
  name: string;
  title: string;
  icon: TabIconName;
  /** The held role lacks the permission: the tab leaves the bar (permission-aware nav). */
  hidden?: boolean;
  /** Count text on the tab (already formatted); none, no badge. */
  badge?: string;
}

/**
 * The bottom tabs: expo-router's JS tabs with our own floating glass bar (GlassTabBar, owner
 * 2026-10-24), the same on iOS and Android. The first tab sits at the inline-start, so in Arabic
 * (RTL) it is on the right. A hidden tab is a protected route: off the bar, and a push into it goes
 * nowhere. Back returns to the first tab, as the native tabs did. The bar is never hidden: a chat is
 * a full screen above the tabs (its chat group, app/_layout.tsx).
 */
export function AppNativeTabs({ tabs }: { tabs: readonly TabItem[] }) {
  const { color } = useTheme();
  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.margin } }}
      tabBar={(props) => <GlassTabBar {...props} tabs={tabs} />}
    >
      {tabs.map((tab) => (
        <Tabs.Protected key={tab.name} guard={tab.hidden !== true}>
          <Tabs.Screen name={tab.name} />
        </Tabs.Protected>
      ))}
    </Tabs>
  );
}
