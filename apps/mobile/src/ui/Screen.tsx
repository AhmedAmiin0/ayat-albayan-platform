import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

const BODY = { paddingHorizontal: 16, paddingTop: 16, gap: 16 } as const;
const SCROLL_BODY = { ...BODY, paddingBottom: 24 } as const;
const CHAT_BODY = { paddingHorizontal: 16, paddingTop: 8, gap: 8 } as const;

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** A chat: 8pt top and between blocks, and the bottom safe area too (it hides the tab bar). */
  chat?: boolean;
}

/**
 * Tab-screen frame: margin background, top safe area (the tab bar owns the bottom), 16pt gutter,
 * 16pt between blocks. Put a FlatList last and give it `style={{ flex: 1 }}`; it does the scrolling.
 * `scroll` for a screen of plain rows with no FlatList («المزيد»): the frame scrolls, so its last row
 * («تسجيل الخروج») is never cut off below the screen.
 */
export function Screen({ children, scroll = false, chat = false }: ScreenProps) {
  const { color } = useTheme();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: color.margin }}
      edges={chat ? ['top', 'bottom'] : ['top']}
    >
      {scroll ? (
        <ScrollView testID="screen-scroll" style={{ flex: 1 }} contentContainerStyle={SCROLL_BODY}>
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, ...(chat ? CHAT_BODY : BODY) }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
