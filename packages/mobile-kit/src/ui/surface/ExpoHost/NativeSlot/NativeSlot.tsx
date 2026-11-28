import { RNHostView } from '@expo/ui';
import type { NativeSlotProps } from './NativeSlot.types';

/** React Native content inside an ExpoHost, sized to it so Arabic text wraps and grows. */
export function NativeSlot({ children }: NativeSlotProps) {
  return (
    <RNHostView matchContents testID="native-slot">
      {children}
    </RNHostView>
  );
}
