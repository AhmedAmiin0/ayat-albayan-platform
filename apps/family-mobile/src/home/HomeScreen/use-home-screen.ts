import { useFamilyPick, usePortalMe } from '@/portal';

export function useHomeScreen() {
  const me = usePortalMe();
  const pick = useFamilyPick();
  const kind = me.data?.kind;
  return { me, pick, kind };
}
