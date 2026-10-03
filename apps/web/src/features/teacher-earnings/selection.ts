import { cents, summarize, type TeacherEarningView } from '@ab/shared';

export const isOpen = (e: Pick<TeacherEarningView, 'outstanding'>): boolean => cents(e.outstanding) > 0;

export const openIds = (sessions: readonly TeacherEarningView[]): string[] => sessions.filter(isOpen).map((e) => e.id);

/** Select-all selects only the open sessions; with all of them already ticked it clears. */
export function toggleAll(sessions: readonly TeacherEarningView[], selected: ReadonlySet<string>): Set<string> {
  const open = openIds(sessions);
  return open.every((id) => selected.has(id)) ? new Set() : new Set(open);
}

export function toggleOne(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (!next.delete(id)) next.add(id);
  return next;
}

/** What the dialog may pay: the ticked sessions' outstanding, or every open session when none is ticked. */
export function dueOf(sessions: readonly TeacherEarningView[], selected: ReadonlySet<string>): number {
  const pool = selected.size > 0 ? sessions.filter((e) => selected.has(e.id)) : sessions;
  return summarize(pool.filter(isOpen)).outstanding;
}
