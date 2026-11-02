import { riyadhToday } from '@ab/time';

// «If the course already started so dont give commission» (owner 2026-10-28, migration 20261028000942
// subscription_already_started). Pure twin; the database decides.

export interface StartFact {
  /** The package's first day (YYYY-MM-DD); absent = not known here. */
  starts_on?: string;
  created_at: string;
  /** «حلقات مستخدمة من الباقة»: lessons taken before the platform (0 by default). */
  lessons_used_before?: number;
}

/**
 * The course started before the package was recorded: its first day is before the Riyadh day of its
 * created_at, or it carries lessons used before. Such a package earns no assistant commission, neither
 * 'first' nor 'renewal'; it still counts by order (commissionKindOf). Same-day and future starts earn.
 * The forms pass now as created_at for their note.
 */
export function subscriptionAlreadyStarted(sub: StartFact): boolean {
  if ((sub.lessons_used_before ?? 0) > 0) return true;
  return !!sub.starts_on && sub.starts_on < riyadhToday(new Date(sub.created_at));
}
