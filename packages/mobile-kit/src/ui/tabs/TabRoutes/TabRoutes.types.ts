import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { TabItem } from '../AppNativeTabs';

export interface TabRoutesProps extends Pick<BottomTabBarProps, 'state' | 'navigation'> {
  tabs: readonly TabItem[];
}

export interface TabRouteItem {
  key: string;
  tab: TabItem;
  focused: boolean;
  onPress: () => void;
}
