import { Sheet, t } from '@ab/mobile-kit';
import { closeChildSwitch } from '@/nav';
import { ChildSwitchList } from '@/switch/ChildSwitchList';
import { useChildSwitchSheet } from './use-child-switch-sheet';

/**
 * The children sheet over every tab (canvas SwitchSheet), opened from a tab header's child button:
 * the kit sheet sized to its rows, closed by a swipe, the scrim, Android's back or a pick. The list
 * draws its own heading once the children have loaded.
 */
export function ChildSwitchSheet() {
  const { open } = useChildSwitchSheet();
  return (
    <Sheet
      open={open}
      onClose={closeChildSwitch}
      label={t.portal.app.pick.title}
      testID="child-switch-sheet"
    >
      <ChildSwitchList />
    </Sheet>
  );
}
