import { Redirect } from 'expo-router';
import { AppNativeTabs } from '@ab/mobile-kit';
import { PICK_HREF } from '@/nav/hrefs';
import { useFamilyTabs } from './use-family-tabs';

/** Picker redirect runs only while tabs are focused, so deep links above them still open. */
export function FamilyTabs() {
  const { choosing, tabs } = useFamilyTabs();
  if (choosing) return <Redirect href={PICK_HREF} />;
  return <AppNativeTabs tabs={tabs} />;
}
