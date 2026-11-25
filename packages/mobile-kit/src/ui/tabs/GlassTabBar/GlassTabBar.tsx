import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { I18nManager, Platform, useWindowDimensions, View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { useTheme } from '../../../theme';
import { BAR_HEIGHT, BAR_SIDE, barBottom } from '../../layout/tab-bar-inset';
import { GlassGradient } from '../../primitives/GlassGradient';
import { useA11yPref } from '../../primitives/use-a11y-pref';
import type { TabItem } from '../AppNativeTabs';
import { TabEdge } from '../TabEdge';
import { TabPill } from '../TabPill';
import { TabRoutes } from '../TabRoutes';
import { usePillOffset } from '../use-pill-offset';
import { useReportBarHeight } from '../use-report-bar-height';

interface GlassTabBarProps extends BottomTabBarProps {
  tabs: readonly TabItem[];
}

/**
 * The bottom tabs as a floating glass capsule «like iOS» (docs/29 §7): 20pt from
 * both sides and 24pt above the bottom safe area, a translucent fill with a white sheen and a 0.5pt
 * edge (no backdrop blur: no blur library in this APK), a grey capsule that springs to the active
 * tab, and a fade of the screen colour behind it so rows scrolling under it melt away. Only the
 * capsule takes touches: the fade passes them through, so nothing beside or above the capsule is a
 * dead strip. Reports its reach (gap + capsule) to the screens (useTabBarInset). Reduce
 * Transparency: an opaque fill.
 */
export function GlassTabBar({ state, navigation, insets, tabs }: GlassTabBarProps) {
  const { color, glass } = useTheme();
  const width = useWindowDimensions().width;
  const opaque = useA11yPref('reduceTransparency');
  const reduceMotion = useA11yPref('reduceMotion');
  const bottom = barBottom(insets.bottom);
  const tabWidth = (width - 2 * BAR_SIDE - 8) / state.routes.length;
  const x = usePillOffset({ index: state.index, tabWidth, rtl: I18nManager.isRTL, reduceMotion });
  useReportBarHeight(bottom + BAR_HEIGHT);
  const sheen = glass.sheen;

  return (
    <>
      <TabEdge bottom={bottom} />
      <View
        testID="glass-capsule"
        accessibilityRole={Platform.OS === 'ios' ? 'tabbar' : 'tablist'}
        accessibilityLabel={t.mobileNav.tabsLabel}
        style={{
          position: 'absolute',
          start: BAR_SIDE,
          end: BAR_SIDE,
          bottom,
          height: BAR_HEIGHT,
          padding: 4,
          borderRadius: BAR_HEIGHT / 2,
          flexDirection: 'row',
          backgroundColor: opaque ? color.raised : glass.fill,
          // The 0.5pt edge as an inset ring: a border would take a point from the 54pt tabs.
          boxShadow: `${glass.shadow}, inset 0 0 0 0.5px ${opaque ? color.rule : glass.border}`,
        }}
      >
        <GlassGradient
          id="tab-sheen"
          color={sheen.color}
          stops={sheen.stops}
          radius={BAR_HEIGHT / 2}
        />
        <TabPill x={x} width={tabWidth} />
        <TabRoutes state={state} navigation={navigation} tabs={tabs} />
      </View>
    </>
  );
}
