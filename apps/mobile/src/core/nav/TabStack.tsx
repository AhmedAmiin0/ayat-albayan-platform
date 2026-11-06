import { Stack } from 'expo-router';
import { useTheme } from '@/theme';
import { useTabListBack } from './use-tab-list-back';

/**
 * Each tab folder's _layout.tsx re-exports these as `unstable_settings`: the tab's list is its
 * stack's first screen, so a cross-tab push (pushInTab) or a deep link loads it beneath a detail
 * screen, and back shows the list, not Today (owner 2026-11-06).
 */
export const tabStackSettings = { initialRouteName: 'index' };

/** The bare stack: no tab bar of its own; the chat groups' stack too (ChatStack). */
export function PlainStack() {
  const { color } = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.margin } }}
    />
  );
}

/**
 * Stack inside one tab, so a tab's detail screens (students/[id].tsx) keep the tab bar. Each tab
 * folder's _layout.tsx only re-exports it as `default` and tabStackSettings as `unstable_settings`.
 * Android's back on a lone detail screen goes to the tab's list (useTabListBack).
 */
export function TabStack() {
  useTabListBack();
  return <PlainStack />;
}
