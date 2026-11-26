import { FamilyTabs } from '@/nav';
import { usePushTaps } from '@/push';
import { ChildSwitchSheet } from '@/switch/ChildSwitchSheet';

/**
 * app/(tabs): the bottom tabs, the children sheet any tab's header opens, and a tapped push
 * opening its screen above them (signed in, the router ready).
 */
export function SwitchTabs() {
  usePushTaps();
  return (
    <>
      <FamilyTabs />
      <ChildSwitchSheet />
    </>
  );
}
