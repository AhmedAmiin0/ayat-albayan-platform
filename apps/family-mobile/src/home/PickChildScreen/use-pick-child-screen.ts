import { familyChildren } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useA11yPref } from '@ab/mobile-kit';
import { useFamilyPick, usePickChild, usePortalMe, useRefreshPortal } from '@/portal';

export function usePickChildScreen() {
  const me = usePortalMe();
  const pick = useFamilyPick();
  // Read once: the pick a press makes must not swap the header while the screen slides away.
  const [switching] = useState(() => pick.state === 'one');
  const pickChild = usePickChild();
  const refresh = useRefreshPortal();
  const still = useA11yPref('reduceMotion');
  // A guardian who also studies sees their own row first.
  const data = me.data && { ...me.data, students: familyChildren(me.data) };
  const students = data?.students ?? [];
  const kind = me.data?.kind ?? 'guardian';
  const choose = (student: PortalStudent) => () => {
    pickChild(student.id);
    router.dismissTo('/');
  };
  return { me, switching, refresh, still, data, students, kind, choose };
}
