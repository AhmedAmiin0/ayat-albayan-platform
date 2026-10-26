import { useClaimBarSlot } from './bar-slot';
import { ConnectingBar } from './ConnectingBar';
import { useScreenFocused } from './use-screen-focus';

/** The reconnecting bar under a screen's large title (ScreenHeader), while that screen is focused; the
 *  title already sits in the screen's 16 pt column, so the card takes no side margin of its own. */
export function HeaderConnectingBar() {
  const focused = useScreenFocused();
  useClaimBarSlot(focused);
  return focused ? <ConnectingBar /> : null;
}
