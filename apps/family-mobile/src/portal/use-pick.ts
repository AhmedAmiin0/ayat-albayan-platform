import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { familyPick, picksChild, pickStore, savedFor, type FamilyPick } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { useMeId } from '@ab/mobile-kit';
import { usePortalMe } from './use-portal-me';

// «اختر الطالب» (owner 2026-11-16, docs/50 §6): the student the app works as, from /portal/me
// and the pick this profile saved on the phone (@ab/client-core familyPick, pickStore).

const store = pickStore(AsyncStorage);

/** The student in view: loading, the picker's turn, none, or one (own, only or picked). */
export function useFamilyPick(): FamilyPick {
  const me = usePortalMe().data;
  const saved = savedFor(useSyncExternalStore(store.subscribe, store.current), useMeId(true));
  return familyPick(me, saved.savedId, saved.ready);
}

/**
 * The child a guardian of several works as, else null (a student's own or an only child needs no
 * name): named in «حسابي» and under «الجدول» and «التقارير».
 */
export function usePickedChild(): PortalStudent | null {
  const me = usePortalMe().data;
  const pick = useFamilyPick();
  return me && picksChild(me) && pick.state === 'one' ? pick.student : null;
}

/** Saves the child this profile works as; every screen follows at once. */
export function usePickChild(): (studentId: string) => void {
  const profileId = useMeId(true);
  return (studentId) => store.pick({ profileId, studentId });
}
