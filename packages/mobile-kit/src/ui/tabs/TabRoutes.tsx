import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { CommonActions } from 'expo-router/react-navigation';
import type { TabItem } from './AppNativeTabs';
import { GlassTab } from './GlassTab';

interface TabRoutesProps extends Pick<BottomTabBarProps, 'state' | 'navigation'> {
  tabs: readonly TabItem[];
}

/** The capsule's tabs, one per route: a press on another tab moves there (tabPress first). */
export function TabRoutes({ state, navigation, tabs }: TabRoutesProps) {
  return state.routes.map((route, index) => {
    const tab = tabs.find((item) => item.name === route.name);
    if (!tab) return null; // only a type guard: Tabs.Screen is made from `tabs`
    const focused = index === state.index;
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        navigation.dispatch({ ...CommonActions.navigate(route), target: state.key });
      }
    };
    return (
      <GlassTab
        key={route.key}
        title={tab.title}
        icon={tab.icon}
        badge={tab.badge}
        focused={focused}
        onPress={onPress}
      />
    );
  });
}
