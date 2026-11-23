import {
  familyPick, picksChild, pickStore, savedFor, type FamilyPick, type SeenStorage,
} from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { meQuery } from '@ab/web-kit/auth';
import { usePortalHome } from './use-portal-home';

// «اختر الطالب» (owner 2026-11-16, docs/50 §6): the student the family pages work as, from
// /portal/me and the pick this profile saved in the browser (@ab/client-core familyPick,
// pickStore). Blocked storage (private mode) keeps the pick for this page view only.

const browser: SeenStorage = {
  getItem: (key) => Promise.resolve().then(() => localStorage.getItem(key)),
  setItem: (key, value) => Promise.resolve().then(() => localStorage.setItem(key, value)),
};

const store = pickStore(browser);

const useProfileId = (): string => useQuery(meQuery).data?.id ?? '';

/** The student in view: loading, the picker's turn, none, or one (own, only or picked). */
export function useFamilyPick(): FamilyPick {
  const me = usePortalHome().data;
  const saved = savedFor(useSyncExternalStore(store.subscribe, store.current), useProfileId());
  return familyPick(me, saved.savedId, saved.ready);
}

/** The child a guardian of several works as, else null (no name to switch from). */
export function usePickedChild(): PortalStudent | null {
  const me = usePortalHome().data;
  const pick = useFamilyPick();
  return me && picksChild(me) && pick.state === 'one' ? pick.student : null;
}

/** Saves the child this profile works as; every page follows at once. */
export function usePickChild(): (studentId: string) => void {
  const profileId = useProfileId();
  return (studentId) => store.pick({ profileId, studentId });
}
