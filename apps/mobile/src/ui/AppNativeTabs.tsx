import { Tabs } from 'expo-router/js-tabs';
import { useCallback, useState } from 'react';
import { useTheme } from '@/theme';
import { GlassTabBar } from './GlassTabBar';
import { TabBarProvider, type TabBarHide } from './tab-bar';
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
 * nowhere. Back returns to the first tab, as the native tabs did. A chat hides the bar while it is
 * open (useHideTabBar): the bar draws nothing, so no route moves and no dead strip stays.
 */
export function AppNativeTabs({ tabs }: { tabs: readonly TabItem[] }) {
  const { color } = useTheme();
  const [hiders, setHiders] = useState(0);
  const hide = useCallback<TabBarHide>((delta) => setHiders((n) => Math.max(0, n + delta)), []);
  return (
    <TabBarProvider value={hide}>
      <Tabs
        backBehavior="initialRoute"
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.margin } }}
        tabBar={(props) => <GlassTabBar {...props} tabs={tabs} hidden={hiders > 0} />}
      >
        {tabs.map((tab) => (
          <Tabs.Protected key={tab.name} guard={tab.hidden !== true}>
            <Tabs.Screen name={tab.name} />
          </Tabs.Protected>
        ))}
      </Tabs>
    </TabBarProvider>
  );
}
