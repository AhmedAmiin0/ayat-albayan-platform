import { FAMILY_TABS, hasFamilyTab } from '@ab/client-core';
import { t, type TabItem } from '@ab/mobile-kit';
import { useFamilyPick } from '@/portal';
import { ICON, ROUTE } from './family-tabs.helpers';

export function useFamilyTabs() {
  const pick = useFamilyPick();
  const tabs: TabItem[] = FAMILY_TABS.map((tab) => ({
    name: ROUTE[tab],
    title: t.portal.app.tabs[tab],
    icon: ICON[tab],
    hidden: !hasFamilyTab(pick, tab),
  }));
  return { choosing: pick.state === 'choose', tabs };
}
