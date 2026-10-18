import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext } from 'react';

/** +1 while a screen wants the bottom tab bar hidden, −1 when it lets go (AppNativeTabs counts). */
export type TabBarHide = (delta: 1 | -1) => void;

const TabBarContext = createContext<TabBarHide>(() => undefined);

export const TabBarProvider = TabBarContext.Provider;

/**
 * Hides the host's bottom tab bar while the calling screen is focused (a chat: more room to read),
 * and gives it back on blur and unmount, so a screen pushed over it (book, subscribe…) and the list
 * behind it keep the bar. A count, not a flag: chat → chat never shows the bar in between, whatever
 * order focus and blur arrive in. Outside a tab host (a test) it does nothing.
 */
export function useHideTabBar(): void {
  const hide = useContext(TabBarContext);
  useFocusEffect(
    useCallback(() => {
      hide(1);
      return () => hide(-1);
    }, [hide]),
  );
}
