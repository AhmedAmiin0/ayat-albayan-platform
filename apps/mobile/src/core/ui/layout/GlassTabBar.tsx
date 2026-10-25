import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs';
import { CommonActions } from 'expo-router/react-navigation';
import { useContext, useEffect } from 'react';
import { Animated, I18nManager, Platform, useWindowDimensions, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import type { TabItem } from './AppNativeTabs';
import { GlassGradient } from '../primitives/GlassGradient';
import { GlassTab } from './GlassTab';
import { BAR_HEIGHT, barBottom } from './tab-bar-inset';
import { useA11yPref } from '../primitives/use-a11y-pref';
import { usePillOffset } from './use-pill-offset';

const EDGE = [[0, 0], [1, 1]] as const;

export interface GlassTabBarProps extends BottomTabBarProps {
  tabs: readonly TabItem[];
}

/**
 * The bottom tabs as a floating glass capsule (owner 2026-10-24, design C): a translucent fill with a
 * top sheen and a 1px inner highlight (no backdrop blur: no blur library in the APK), a pill that
 * springs to the active tab, and a fade of the screen colour behind it so rows scrolling under it melt
 * away. Reports its reach (gap + capsule) to the screens (useTabBarInset). Reduce Transparency: an
 * opaque fill.
 */
export function GlassTabBar({ state, navigation, insets, tabs }: GlassTabBarProps) {
  const { color, glass } = useTheme();
  const width = useWindowDimensions().width;
  const opaque = useA11yPref('reduceTransparency');
  const reduceMotion = useA11yPref('reduceMotion');
  const bottom = barBottom(insets.bottom);
  const tabWidth = (width - 40) / state.routes.length;
  const x = usePillOffset({ index: state.index, tabWidth, rtl: I18nManager.isRTL, reduceMotion });
  const report = useContext(BottomTabBarHeightCallbackContext);
  useEffect(() => {
    report?.(bottom + BAR_HEIGHT);
  }, [report, bottom]);

  return (
    <>
      <View
        style={{ position: 'absolute', start: 0, end: 0, bottom: 0, height: bottom + BAR_HEIGHT + 32, pointerEvents: 'none' }}
      >
        <GlassGradient id="tab-edge" color={color.margin} stops={EDGE} />
      </View>
      <View
        testID="glass-capsule"
        accessibilityRole={Platform.OS === 'ios' ? 'tabbar' : 'tablist'}
        accessibilityLabel={t.mobileNav.tabsLabel}
        style={{
          position: 'absolute',
          start: 16,
          end: 16,
          bottom,
          height: BAR_HEIGHT,
          padding: 4,
          borderRadius: 32,
          flexDirection: 'row',
          backgroundColor: opaque ? color.raised : glass.fill,
          boxShadow: glass.shadow,
        }}
      >
        <GlassGradient id="tab-sheen" color={glass.sheen.color} stops={glass.sheen.stops} radius={32} />
        <Animated.View
          style={{
            position: 'absolute',
            start: 4,
            top: 4,
            bottom: 4,
            width: tabWidth,
            borderRadius: 28,
            backgroundColor: color.lapisWash,
            boxShadow: glass.pillShadow,
            transform: [{ translateX: x }],
          }}
        />
        {state.routes.map((route, index) => {
          const tab = tabs.find((item) => item.name === route.name);
          if (!tab) return null; // only a type guard: Tabs.Screen is made from `tabs`
          const focused = index === state.index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.dispatch({ ...CommonActions.navigate(route), target: state.key });
            }
          };
          return (
            <GlassTab key={route.key} title={tab.title} icon={tab.icon} badge={tab.badge} focused={focused} onPress={onPress} />
          );
        })}
      </View>
    </>
  );
}
