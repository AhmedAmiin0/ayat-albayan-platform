import { router } from 'expo-router';
import { openPushed } from '@/core/nav/back-within';
import { isThreadHref, overChat, overRoom, type NavState } from '@/core/nav/chat-groups';

/** The root navigator as the tap reads it (expo-router's container ref). */
export interface RootNav {
  isReady: () => boolean;
  getRootState: () => NavState | undefined;
  addListener: (type: 'state', listener: () => void) => () => void;
}

const rootOf = (nav: RootNav): NavState | undefined =>
  nav.isReady() ? nav.getRootState() : undefined;

/**
 * Over a chat (a full screen above the tabs), a tab's screen pops back to the tabs: a push would
 * stack a second tab host. Another chat is pushed inside the chat's own group.
 */
function go(href: string, root: NavState | undefined): void {
  if (overChat(root) && !isThreadHref(href)) router.dismissTo(href, { withAnchor: true });
  else openPushed(href);
}

/**
 * Where a tapped push goes. In the live room it waits (it stacked the tabs over the lesson, #bug):
 * the last one held opens once the room is left. `stop` ends the watch.
 */
export function tapRouter(nav: RootNav) {
  let held: string | null = null;
  const stop = nav.addListener('state', () => {
    const root = rootOf(nav);
    if (held === null || overRoom(root)) return;
    const href = held;
    held = null;
    go(href, root);
  });
  return {
    stop,
    open: (href: string) => {
      const root = rootOf(nav);
      if (overRoom(root)) held = href;
      else go(href, root);
    },
  };
}
