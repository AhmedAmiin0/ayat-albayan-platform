import { GlassTab } from '../GlassTab';
import { tabRouteItems } from './tab-routes.helpers';
import type { TabRoutesProps } from './TabRoutes.types';

/** The capsule's tabs, one per route: a press on another tab moves there (tabPress first). */
export function TabRoutes({ state, navigation, tabs }: TabRoutesProps) {
  const items = tabRouteItems({ state, navigation, tabs });
  return items.map((item) => (
    <GlassTab
      key={item.key}
      title={item.tab.title}
      icon={item.tab.icon}
      badge={item.tab.badge}
      focused={item.focused}
      onPress={item.onPress}
    />
  ));
}
