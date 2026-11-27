import { useTheme } from '../../../theme';
import { ConnectingBar } from '../ConnectingBar';
import type { TopConnectingBarProps } from './TopConnectingBar.types';
import { useTopConnectingBar } from './use-top-connecting-bar';

/**
 * The reconnecting bar for a screen with no header (root layout, above the stack): under the top
 * safe area, pushing the screen down. The screens' own SafeAreaView measures its position, so the
 * inset is never doubled. A focused ScreenHeader shows the bar itself, and then this one steps aside.
 */
export function TopConnectingBar({ store }: TopConnectingBarProps) {
  const { color } = useTheme();
  const { top, claimed } = useTopConnectingBar();
  if (claimed) return null;
  return <ConnectingBar store={store} inset={top} background={color.margin} gutter={16} />;
}
