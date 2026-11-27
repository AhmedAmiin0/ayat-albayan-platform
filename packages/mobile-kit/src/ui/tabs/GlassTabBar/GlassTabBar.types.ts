import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { TabItem } from '../AppNativeTabs';

export interface GlassTabBarProps extends BottomTabBarProps {
  tabs: readonly TabItem[];
}
