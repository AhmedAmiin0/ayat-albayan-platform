import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

const BODY = { paddingHorizontal: 16, paddingTop: 16, gap: 16 } as const;

/**
 * Tab-screen frame: margin background, top safe area (the tab bar owns the bottom), 16pt gutter,
 * 16pt between blocks. Put a FlatList last and give it `style={{ flex: 1 }}`; it does the scrolling.
 * `scroll` for a screen of plain rows with no FlatList («المزيد»): the frame scrolls, so its last row
 * («تسجيل الخروج») is never cut off below the screen.
 */
export function Screen({ children, scroll = false }: { children: ReactNode; scroll?: boolean }) {
  const { color } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.margin }} edges={['top']}>
      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ ...BODY, paddingBottom: 24 }}>
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, ...BODY }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
