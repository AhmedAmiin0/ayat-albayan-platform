import { BottomSheet } from '@expo/ui';
import { useTheme } from '@ab/mobile-kit';
import { closeChildSwitch, useChildSwitch } from '@/nav';
import { ChildSwitchList } from '@/switch/ChildSwitchList';

/**
 * The children sheet over every tab (canvas SwitchSheet), opened from a tab
 * header's child button: the native bottom sheet (@expo/ui), sized to its rows, closed by a swipe,
 * the scrim, Android's back or a pick.
 */
export function ChildSwitchSheet() {
  const { color } = useTheme();
  const { open } = useChildSwitch();
  return (
    <BottomSheet
      isPresented={open}
      onDismiss={closeChildSwitch}
      containerColor={color.raised}
      scrimColor={color.scrim}
      contentPadding={{ top: 8, bottom: 32, left: 16, right: 16 }}
      testID="child-switch-sheet"
    >
      <ChildSwitchList />
    </BottomSheet>
  );
}
