import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

/**
 * The scrolling body of a Screen whose blocks can outgrow the phone (the «المزيد» screens): the
 * header stays above it and the last block («تسجيل الخروج») scrolls into view above the tab bar
 * instead of being cut off below it. Full-bleed rows (marginHorizontal: -16) still reach the edges.
 *
 * iOS: the native tabs only inset the first scroll view of a screen, and this one comes after the
 * header, so its content would end under the UITabBar. 'automatic' adds the scroll view's own
 * safe area (tab bar + home indicator) at the bottom; its top sits below the header, out of the
 * top safe area, so nothing is added there. Android ignores it (the tabs pad the bottom already).
 */
export function ScreenScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      testID="screen-scroll"
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustsScrollIndicatorInsets
      style={{ flex: 1, marginHorizontal: -16 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 16 }}
    >
      {children}
    </ScrollView>
  );
}
