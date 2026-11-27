import { usePullRefresh } from '@ab/mobile-kit';
import type { FamilyPageProps } from './FamilyPage.types';

export function useFamilyPage(onRefresh: FamilyPageProps['onRefresh']) {
  const pull = usePullRefresh(onRefresh);
  return { pull };
}
