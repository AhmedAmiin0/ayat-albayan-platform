import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ConnectivityStore } from '@/core/lib/connectivity/connectivity-store';
import { useTheme } from '@/theme';
import { useBarSlotClaimed } from './bar-slot';
import { ConnectingBar } from './ConnectingBar';

/**
 * The reconnecting bar for a screen with no header (root layout, above the stack): under the top
 * safe area, pushing the screen down. The screens' own SafeAreaView measures its position, so the
 * inset is never doubled. A focused ScreenHeader shows the bar itself, and then this one steps aside.
 */
export function TopConnectingBar({ store }: { store?: ConnectivityStore }) {
  const { top } = useSafeAreaInsets();
  const { color } = useTheme();
  const claimed = useBarSlotClaimed();
  if (claimed) return null;
  return <ConnectingBar store={store} inset={top} background={color.margin} />;
}
