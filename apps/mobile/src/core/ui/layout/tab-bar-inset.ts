import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { useContext } from 'react';

/** The floating capsule: 4 + 54 tab + 4 (docs/29 §7). */
export const BAR_HEIGHT = 62;

/** The capsule floats 24pt above the bottom safe area (the home indicator / nav bar). */
export const BAR_GAP = 24;

/** The capsule's distance from the screen's bottom edge. */
export const barBottom = (insetBottom: number) => insetBottom + BAR_GAP;

/** The capsule's gap to the screen's sides. */
export const BAR_SIDE = 20;

/**
 * How far the floating tab bar reaches up from the screen's bottom edge (its gap + the capsule):
 * content that runs under it pads its end by this much. 0 outside a tab navigator (login, a test,
 * a full-screen chat). The bar reports it
 * (GlassTabBar), the tab navigator hands it to every screen; useBottomTabBarHeight() would throw
 * outside the tabs.
 */
export const useTabBarInset = () => useContext(BottomTabBarHeightContext) ?? 0;
