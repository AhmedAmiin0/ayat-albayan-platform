import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { useContext } from 'react';

/** The floating capsule: 4 + 56 tab + 4. */
export const BAR_HEIGHT = 64;

/** The capsule's gap to the screen's bottom edge: the home indicator / nav bar, never under 16. */
export const barBottom = (insetBottom: number) => Math.max(insetBottom, 16);

/**
 * How far the floating tab bar reaches up from the screen's bottom edge (its gap + the capsule):
 * content that runs under it pads its end by this much. 0 outside a tab navigator (login, a test,
 * a full-screen chat). The bar reports it
 * (GlassTabBar), the tab navigator hands it to every screen; useBottomTabBarHeight() would throw
 * outside the tabs.
 */
export const useTabBarInset = () => useContext(BottomTabBarHeightContext) ?? 0;
