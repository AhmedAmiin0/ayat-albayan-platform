import { BottomTabBarHeightCallbackContext } from 'expo-router/js-tabs';
import { use, useEffect } from 'react';

/** Tells the tab screens how far the bar reaches (gap + capsule): useTabBarInset reads it. */
export function useReportBarHeight(height: number): void {
  const report = use(BottomTabBarHeightCallbackContext);
  useEffect(() => {
    report?.(height);
  }, [report, height]);
}
