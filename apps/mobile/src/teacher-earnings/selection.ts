import { cents, fromCents, type TeacherEarningView } from '@ab/shared';

// Which sessions are ticked on the admin screen. Only sessions with something owed can be ticked;
// everything is pure so it is unit-tested (the screen only holds the id list).

type Owed = Pick<TeacherEarningView, 'id' | 'outstanding'>;

export const isOpen = (s: Owed): boolean => cents(s.outstanding) > 0;

export const openIds = (sessions: readonly Owed[]): string[] => sessions.filter(isOpen).map((s) => s.id);

export function toggleId(selected: readonly string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
}

/** Select-all ticks every open session; when all are ticked already it clears. */
export function toggleAll(sessions: readonly Owed[], selected: readonly string[]): string[] {
  const open = openIds(sessions);
  return open.length > 0 && open.every((id) => selected.includes(id)) ? [] : open;
}

/** What is still owed on the ticked sessions (ids no longer open are ignored). */
export function selectedDue(sessions: readonly Owed[], selected: readonly string[]): number {
  const total = sessions
    .filter((s) => selected.includes(s.id) && isOpen(s))
    .reduce((n, s) => n + cents(s.outstanding), 0);
  return fromCents(total);
}
