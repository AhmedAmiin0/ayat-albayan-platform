import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBarSlotClaimed } from '../bar-slot';

export function useTopConnectingBar() {
  const { top } = useSafeAreaInsets();
  const claimed = useBarSlotClaimed();
  return { top, claimed };
}
