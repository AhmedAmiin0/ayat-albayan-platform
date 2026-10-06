import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { type, useTheme } from '@/theme';
import { TAB_ICONS, type TabIconName } from './tab-icons';

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
        <NativeTabs.Trigger key={tab.name} name={tab.name} hidden={tab.hidden === true}>
          <NativeTabs.Trigger.Icon sf={TAB_ICONS[tab.icon].sf} src={TAB_ICONS[tab.icon].src} />
          <NativeTabs.Trigger.Label>{tab.title}</NativeTabs.Trigger.Label>
          {tab.badge ? <NativeTabs.Trigger.Badge>{tab.badge}</NativeTabs.Trigger.Badge> : null}
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
