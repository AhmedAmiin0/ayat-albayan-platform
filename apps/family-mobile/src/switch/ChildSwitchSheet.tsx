import { MenuSheet, t } from '@ab/mobile-kit';
import { closeChildSwitch, useChildSwitch } from '@/nav';
import { ChildSwitchList } from './ChildSwitchList';

/**
 * The children sheet over every tab (owner 2026-11-16), opened from a tab header's child button.
 * The kit's bottom sheet for now; the native one (@expo/ui BottomSheet) once it ships.
 */
export function ChildSwitchSheet() {
  const { open } = useChildSwitch();
  return (
    <MenuSheet
      open={open}
      label={t.portal.app.pick.title}
      testID="child-switch-sheet"
      onClose={closeChildSwitch}
    >
      <ChildSwitchList />
    </MenuSheet>
  );
}
