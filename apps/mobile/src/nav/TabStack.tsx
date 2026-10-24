import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

/**
 * Stack inside one tab, so a tab's detail screens (students/[id].tsx) keep the tab bar.
 * Each tab folder's _layout.tsx is just `export { TabStack as default } from '@/nav/TabStack';`.
 * Also the stack of the chat groups above the tabs (through ChatStack).
 */
export function TabStack() {
  const { color } = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.margin } }}
    />
  );
}
