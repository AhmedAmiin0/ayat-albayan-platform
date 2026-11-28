import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useRoomTopBar() {
  const insets = useSafeAreaInsets();
  return { insets };
}
