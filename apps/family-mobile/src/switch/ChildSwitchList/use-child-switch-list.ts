import { familyChildren } from '@ab/client-core';
import { useFamilyPick, usePortalMe } from '@/portal';
import { useSwitchChild } from '@/switch/use-switch-child';

export function useChildSwitchList() {
  const me = usePortalMe().data;
  const pick = useFamilyPick();
  const kind = me?.kind ?? 'guardian';
  const switchTo = useSwitchChild(kind);
  const currentId = pick.state === 'one' ? pick.student.id : null;
  const students = familyChildren(me ?? { students: [] });
  return { loaded: me !== undefined, students, kind, currentId, switchTo };
}
