import { useClaimBarSlot } from '../bar-slot';
import { useScreenFocused } from '../use-screen-focus';

export function useHeaderConnectingBar() {
  const focused = useScreenFocused();
  useClaimBarSlot(focused);
  return { focused };
}
