import type { PortalHome, PortalStudent } from '@ab/shared';

// docs/50 §6: pages opened from a push or a link are never filtered by the pick.

export type FamilyPick =
  | { state: 'loading' | 'choose' | 'empty' }
  | { state: 'one'; student: PortalStudent };

const LOADING: FamilyPick = { state: 'loading' };
const CHOOSE: FamilyPick = { state: 'choose' };
const EMPTY: FamilyPick = { state: 'empty' };

const one = (student: PortalStudent): FamilyPick => ({ state: 'one', student });

/** A guardian of two or more children works as one of them at a time (the picker). */
export const picksChild = (me: PortalHome): boolean =>
  me.kind === 'guardian' && me.students.length > 1;

/**
 * The student in view from /portal/me (undefined while it loads), this login's saved student id
 * and whether the saved one is read yet. Only a choice to make waits on the phone, so neither the
 * picker nor a child flashes before the saved pick is known.
 */
export function familyPick(
  me: PortalHome | undefined,
  savedId: string | null,
  ready: boolean,
): FamilyPick {
  if (!me) return LOADING;
  const [first] = me.students;
  if (!first) return EMPTY;
  if (!picksChild(me)) return one(first);
  if (!ready) return LOADING;
  const saved = me.students.find((s) => s.id === savedId);
  return saved ? one(saved) : CHOOSE;
}
