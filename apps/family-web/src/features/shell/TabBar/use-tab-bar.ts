import { familyTabs } from '@ab/client-core';
import { useLocation } from '@tanstack/react-router';
import { tabOf } from '@/features/shell/tab-links';
import { useFamilyPick } from '@/features/shell/use-family-pick';

export function useTabBar() {
  const pick = useFamilyPick();
  const tabs = familyTabs(pick);
  const current = tabOf(useLocation().pathname);
  const loading = pick.state === 'loading';
  return { tabs, current, loading };
}
