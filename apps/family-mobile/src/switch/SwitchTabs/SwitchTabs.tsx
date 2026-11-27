import { FamilyTabs } from '@/nav';
import { ChildSwitchSheet } from '@/switch/ChildSwitchSheet';
import { useSwitchTabs } from './use-switch-tabs';

/**
 * app/(tabs): the bottom tabs, the children sheet any tab's header opens, and a tapped push
 * opening its screen above them (signed in, the router ready).
 */
export function SwitchTabs() {
  useSwitchTabs();
  return (
    <>
      <FamilyTabs />
      <ChildSwitchSheet />
    </>
  );
}
