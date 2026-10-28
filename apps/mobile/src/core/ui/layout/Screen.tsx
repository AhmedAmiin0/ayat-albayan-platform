import { createContext, type ReactNode, useContext } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useTabBarInset } from './tab-bar-inset';

const BODY = { paddingHorizontal: 16, paddingTop: 8, gap: 16 } as const;
/** A chat, and a list screen's header blocks (title, search, pills): the tight 8pt rhythm (owner 2026-10-28). */
const TIGHT_BODY = { paddingHorizontal: 16, paddingTop: 8, gap: 8 } as const;

const FullScreenContext = createContext(false);

/** Set by a stack above the tabs (ChatStack): no tab bar under its screens, they own the bottom. */
export const FullScreenProvider = FullScreenContext.Provider;

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** A chat: 8pt top and between blocks, and the bottom safe area too (a full screen above the tabs). */
  chat?: boolean;
  /**
   * The last child is a vertical list that runs under the floating tab bar and adds useTabBarInset() to
   * its contentContainerStyle; the header blocks above it stack 8pt apart, so the first row shows early.
   */
  list?: boolean;
  /** Inside a <Modal> sheet: no bar is drawn there, but context crosses the Modal, so the inset is ignored. */
  sheet?: boolean;
}

/**
 * Screen frame: margin background, top safe area (in the tabs the tab bar owns the bottom; above them,
 * under FullScreenProvider, the frame takes it too), 8pt under it (owner 2026-10-27: the header sat
 * too low), 16pt gutter (every group of rows sits inside it in an inset card, surface/inset.tsx),
 * 16pt between blocks (8pt on a chat or a list screen). Put a
 * FlatList last and give it `style={{ flex: 1 }}`; it does the scrolling.
 * `scroll` for a screen of plain rows with no FlatList («المزيد»): the frame scrolls, so its last row
 * («تسجيل الخروج») is never cut off below the screen.
 */
export function Screen({ children, scroll = false, chat = false, list = false, sheet = false }: ScreenProps) {
  const bar = useTabBarInset();
  const inset = sheet ? 0 : bar;
  const { color } = useTheme();
  const fullScreen = useContext(FullScreenContext);
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: color.margin }}
      edges={chat || fullScreen ? ['top', 'bottom'] : ['top']}
    >
      {scroll ? (
        <ScrollView testID="screen-scroll" style={{ flex: 1 }} contentContainerStyle={{ ...BODY, paddingBottom: 24 + inset }}>
          {children}
        </ScrollView>
      ) : (
        <View testID="screen-body" style={{ flex: 1, ...(chat || list ? TIGHT_BODY : BODY), paddingBottom: chat || list ? 0 : inset }}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
