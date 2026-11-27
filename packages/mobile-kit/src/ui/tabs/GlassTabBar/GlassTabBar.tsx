import { Platform, View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { BAR_HEIGHT, BAR_SIDE } from '../../layout/tab-bar-inset';
import { GlassGradient } from '../../primitives/GlassGradient';
import { TabEdge } from '../TabEdge';
import { TabPill } from '../TabPill';
import { TabRoutes } from '../TabRoutes';
import type { GlassTabBarProps } from './GlassTabBar.types';
import { useGlassTabBar } from './use-glass-tab-bar';

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
  const { color, glass, opaque, bottom, tabWidth, x, sheen } = useGlassTabBar({ state, insets });
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
