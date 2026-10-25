import { salesStartDate } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

// The sales subscribe's first day (owner 2026-10-12, docs/16 row 24). Pure. Without
// subscriptions.set_start_date nothing is asked or sent (the API starts the package on today). With it:
// the day chips, or «بدأ الاشتراك سابقًا» and a past day picked with steppers (rule 6: never typed)
// down to a year back (salesStartDate, the API's own rule, so its 400 shows before posting). Every day
// is the academy's (Riyadh), as the API checks it.

export interface StartDraft {
  /** The chip picked (academy YYYY-MM-DD). */
  day: string;
  /** «بدأ الاشتراك سابقًا» is on. */
  alreadyStarted: boolean;
  /** The past day picked while it is on (YYYY-MM-DD, from the StartDayPicker). */
  past: string;
}

/** What POST /sales/subscriptions gets: nothing, a day, or a past day with alreadyStarted. */
export type StartBody = { startsOn?: string; alreadyStarted?: true };
export type StartCheck = { ok: true; body: StartBody } | { ok: false; error: string };

/** `today`: the academy's (Riyadh) day, as the API checks it. */
export function checkStart(draft: StartDraft, context: { canSet: boolean; today: string }): StartCheck {
  if (!context.canSet) return { ok: true, body: {} };
  const startsOn = draft.alreadyStarted ? draft.past : draft.day;
  const alreadyStarted = draft.alreadyStarted ? true : undefined;
  const result = salesStartDate({ startsOn, alreadyStarted, canSet: true, today: context.today });
  if (!result.ok) return { ok: false, error: t.salesMoney.error[result.code] };
  return { ok: true, body: alreadyStarted ? { startsOn: result.startsOn, alreadyStarted } : { startsOn: result.startsOn } };
}
