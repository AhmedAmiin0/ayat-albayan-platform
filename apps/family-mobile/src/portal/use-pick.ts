import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { familyPick, picksChild, pickStore, savedFor, type FamilyPick } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { useMeId } from '@ab/mobile-kit';
import { usePortalMe } from './use-portal-me';

// docs/50 §6: the student the app works as, from /portal/me and this profile's saved pick.

const store = pickStore(AsyncStorage);

/**
 * The student in view: loading, the picker's turn, none, or one (own, only or picked). Not enabled
 * (signed out), nothing is fetched.
 */
export function useFamilyPick(enabled = true): FamilyPick {
  const me = usePortalMe(enabled).data;
  const saved = savedFor(useSyncExternalStore(store.subscribe, store.current), useMeId(enabled));
  return familyPick(me, saved.savedId, saved.ready);
}

/** null for a student's own login or an only child, which need no name. */
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
