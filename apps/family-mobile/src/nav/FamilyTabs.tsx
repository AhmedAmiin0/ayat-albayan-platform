import { FAMILY_TABS, hasFamilyTab, type FamilyTab } from '@ab/client-core';
import { Redirect } from 'expo-router';
import { AppNativeTabs, t, type TabIconName, type TabItem } from '@ab/mobile-kit';
import { useFamilyPick } from '@/portal';
import { PICK_HREF } from './hrefs';

/** Each tab's route under app/(tabs) and its icon. */
const ROUTE: Record<FamilyTab, string> = {
  home: 'index',
  schedule: 'schedule',
  reports: 'reports',
  account: 'account',
};
const ICON: Record<FamilyTab, TabIconName> = {
  home: 'home',
  schedule: 'schedule',
  reports: 'reports',
  account: 'account',
};

/** Picker redirect runs only while tabs are focused, so deep links above them still open. */
export function FamilyTabs() {
  const pick = useFamilyPick();
  if (pick.state === 'choose') return <Redirect href={PICK_HREF} />;
  const tabs: TabItem[] = FAMILY_TABS.map((tab) => ({
    name: ROUTE[tab],
    title: t.portal.app.tabs[tab],
    icon: ICON[tab],
    hidden: !hasFamilyTab(pick, tab),
  }));
  return <AppNativeTabs tabs={tabs} />;
}
