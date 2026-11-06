import { type Href, router } from 'expo-router';

/**
 * Back inside the current stack when a screen sits beneath (canDismiss), else `fallback`. Never
 * router.canGoBack(): it is also true through the tabs' history, whose back (backBehavior
 * "initialRoute") lands on Today from any lone detail screen (owner 2026-11-06).
 */
export function backOr(fallback: () => void): void {
  const go = router.canDismiss() ? () => router.back() : fallback;
  go();
}

/** Back inside the stack, else replace with the tab's own list (`list`). */
export const backWithin = (list: Href): void => backOr(() => router.replace(list));

/**
 * A push into another tab's stack with that tab's list (its initialRouteName, tabStackSettings)
 * loaded beneath, so back shows the list and not Today.
 */
export const pushInTab = (href: Href): void => router.push(href, { withAnchor: true });
