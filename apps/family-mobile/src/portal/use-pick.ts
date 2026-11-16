import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { familyPick, pickStore, savedFor, type FamilyPick } from '@ab/client-core';
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

/** Saves the child this profile works as; every screen follows at once. */
export function usePickChild(): (studentId: string) => void {
  const profileId = useMeId(true);
  return (studentId) => store.pick({ profileId, studentId });
}
