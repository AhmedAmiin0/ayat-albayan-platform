// Executable specification of public.v_teacher_countable_earnings (migration 183): which ledger
// sessions the API shows, totals and lets the admin pay. Read-time only; no earning is deleted.

export interface CountableLesson {
  /** schedule_rules.package of the lesson's rule; null when the lesson has no rule. */
  rulePackage: string | null;
  /** students.status of every student on the lesson (lesson_students). */
  studentStatuses: readonly string[];
}

/** Subscribed = students.status 'active'; 'trial', 'paused' and 'churned' are not. */
export const SUBSCRIBED_STATUS = 'active';

/** Not a trial lesson AND at least one student on it is subscribed. */
export function isCountableSession(l: CountableLesson): boolean {
  if (l.rulePackage === 'trial') return false;
  return l.studentStatuses.some((s) => s === SUBSCRIBED_STATUS);
}
