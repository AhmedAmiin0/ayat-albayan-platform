import { FAMILY_TABS, hasFamilyTab, type FamilyTab } from '@ab/client-core';
import { Redirect } from 'expo-router';
import { AppNativeTabs, t, type TabIconName, type TabItem } from '@ab/mobile-kit';
import { useFamilyPick } from '#/portal/index.ts';
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

/**
 * The bottom tabs (owner 2026-11-15, 2026-11-16): الرئيسية · الجدول · التقارير · حسابي of the
 * student in view (a student's own, a guardian's only or picked child); «التقارير» waits until
 * that student is known. A guardian of several children with no pick yet goes to «اختر الطالب»
 * first: every tab passes through this layout, and the redirect runs only while the tabs are in
 * focus, so a push or a link to a child, report or package above them still opens.
 */
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
