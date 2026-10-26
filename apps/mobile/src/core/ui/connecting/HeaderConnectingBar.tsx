import { useClaimBarSlot } from './bar-slot';
import { ConnectingBar } from './ConnectingBar';
import { useScreenFocused } from './use-screen-focus';

/** The reconnecting bar under a screen's large title (ScreenHeader), while that screen is focused. */
export function HeaderConnectingBar() {
  const focused = useScreenFocused();
  useClaimBarSlot(focused);
  return focused ? <ConnectingBar /> : null;
}
