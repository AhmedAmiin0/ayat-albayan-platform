import { FAMILY_TABS, familyTabs, type FamilyTab } from '@ab/client-core';
import { AppNativeTabs, t, type TabIconName, type TabItem } from '@ab/mobile-kit';
import { usePortalMe } from '@/portal';

/** Each tab's route under app/(tabs) and its icon. */
const ROUTE: Record<FamilyTab, string> = {
  home: 'index',
  schedule: 'schedule',
  children: 'children',
  reports: 'reports',
  account: 'account',
};
const ICON: Record<FamilyTab, TabIconName> = {
  home: 'home',
  schedule: 'schedule',
  children: 'students',
  reports: 'reports',
  account: 'account',
};

/** Until /portal/me answers: the tabs every login has (no «أبنائي» flash for a student). */
const COMMON: readonly FamilyTab[] = ['home', 'schedule', 'account'];

/**
 * The bottom tabs (owner 2026-11-15): a guardian الرئيسية · الجدول · أبنائي · حسابي, a student
 * الرئيسية · الجدول · التقارير · حسابي. A tab the login lacks is a protected route: unreachable.
 * The kit's glass bar animates its pill between tabs.
 */
export function FamilyTabs() {
  const kind = usePortalMe().data?.kind;
  const shown = kind ? familyTabs(kind) : COMMON;
  const tabs: TabItem[] = FAMILY_TABS.map((tab) => ({
    name: ROUTE[tab],
    title: t.portal.app.tabs[tab],
    icon: ICON[tab],
    hidden: !shown.includes(tab),
  }));
  return <AppNativeTabs tabs={tabs} />;
}
