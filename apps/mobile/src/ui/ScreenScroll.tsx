import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

/**
 * The scrolling body of a Screen whose blocks can outgrow the phone (the «المزيد» screens): the
 * header stays above it and the last block («تسجيل الخروج») scrolls into view above the tab bar
 * instead of being cut off below it. Full-bleed rows (marginHorizontal: -16) still reach the edges.
 */
export function ScreenScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      testID="screen-scroll"
      style={{ flex: 1, marginHorizontal: -16 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 16 }}
    >
      {children}
    </ScrollView>
  );
}
