import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

/**
 * Tab-screen frame: margin background, top safe area (the tab bar owns the bottom), 16pt gutter,
 * 16pt between blocks. Put a FlatList last and give it `style={{ flex: 1 }}`; it does the scrolling.
 */
export function Screen({ children }: { children: ReactNode }) {
  const { color } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.margin }} edges={['top']}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>{children}</View>
    </SafeAreaView>
  );
}
