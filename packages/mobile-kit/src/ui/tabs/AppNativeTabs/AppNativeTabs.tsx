import { Tabs } from 'expo-router/js-tabs';
import { useTheme } from '../../../theme';
import { GlassTabBar } from '../GlassTabBar';
import type { AppNativeTabsProps } from './AppNativeTabs.types';

/**
 * The bottom tabs: expo-router's JS tabs with our own floating glass bar (GlassTabBar, owner
 * 2026-10-24), the same on iOS and Android. The first tab sits at the inline-start, so in Arabic
 * (RTL) it is on the right. A hidden tab is a protected route: off the bar, and a push into it goes
 * nowhere. Back returns to the first tab, as the native tabs did. The bar is never hidden: a chat
 * is a full screen above the tabs (its chat group, app/_layout.tsx).
 */
export function AppNativeTabs({ tabs }: AppNativeTabsProps) {
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
