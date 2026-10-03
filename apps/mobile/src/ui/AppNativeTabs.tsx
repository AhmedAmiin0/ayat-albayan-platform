import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { type, useTheme } from '@/theme';
import { TAB_ICONS, type TabIconName } from './tab-icons';

export interface TabItem {
  /** The route segment of the tab (folder or file under the layout). */
  name: string;
  title: string;
  icon: TabIconName;
}

/**
 * The bottom tab bar as the platform's own (UITabBar on iOS, Material bottom navigation on
 * Android): native gestures, haptics and accessibility. The first tab sits at the inline-start, so
 * in Arabic (RTL) it is on the right, as before. Colours and font are the app's (docs/07 §12).
 */
export function AppNativeTabs({ tabs }: { tabs: readonly TabItem[] }) {
  const { color } = useTheme();
  return (
    <NativeTabs
      tintColor={color.lapis}
      iconColor={{ default: color.ink3, selected: color.lapis }}
      backgroundColor={color.raised}
      labelStyle={{
        default: { color: color.ink3, fontFamily: type.ui[600], fontSize: type.size['2xs'] },
        selected: { color: color.lapis, fontFamily: type.ui[600], fontSize: type.size['2xs'] },
      }}
    >
      {tabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Icon sf={TAB_ICONS[tab.icon].sf} src={TAB_ICONS[tab.icon].src} />
          <NativeTabs.Trigger.Label>{tab.title}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
