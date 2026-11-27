import { ConnectingBar } from '../ConnectingBar';
import { useHeaderConnectingBar } from './use-header-connecting-bar';

/** The reconnecting bar under a screen's large title (ScreenHeader), while that screen is focused; the
 *  title already sits in the screen's 16 pt column, so the card takes no side margin of its own. */
export function HeaderConnectingBar() {
  const { focused } = useHeaderConnectingBar();
  return focused ? <ConnectingBar /> : null;
}
