import { salesStartDate, usedBeforeProblem } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { usedBefore } from '@/subscribe';

// The sales subscribe's first day (owner 2026-10-12, docs/16 row 24). Pure. Without
// subscriptions.set_start_date nothing is asked or sent (the API starts the package on today). With it:
// the day chips, or «بدأ الاشتراك سابقًا» and a past day picked with steppers (rule 6: never typed)
// down to a year back (salesStartDate, the API's own rule, so its 400 shows before posting). Every day
// is the academy's (Riyadh), as the API checks it. With the switch on, «حلقات مستخدمة من الباقة» too
// (owner 2026-10-28): sent only above 0, and only with a past day (usedBeforeProblem, the API's rule).

export interface StartDraft {
  /** The chip picked (academy YYYY-MM-DD). */
  day: string;
  /** «بدأ الاشتراك سابقًا» is on. */
  alreadyStarted: boolean;
  /** The past day picked while it is on (YYYY-MM-DD, from the StartDayPicker). */
  past: string;
  /** «حلقات مستخدمة من الباقة» while it is on (0 when off). */
  usedBefore: number;
}

/** The used lessons that count: 0 with the switch off, else clamped to the package now picked. */
export const usedBeforeOf = (draft: StartDraft, lessonsTotal: number): number =>
  draft.alreadyStarted ? usedBefore(draft.usedBefore, lessonsTotal) : 0;

/** What POST /sales/subscriptions gets: nothing, a day, or a past day with alreadyStarted (and the used lessons). */
type StartBody = { startsOn?: string; alreadyStarted?: true; lessonsUsedBefore?: number };
type StartCheck = { ok: true; body: StartBody } | { ok: false; error: string };

interface StartContext {
  canSet: boolean;
  /** The academy's (Riyadh) day, as the API checks it. */
  today: string;
  /** The picked package's lessons (the quote's). */
  lessonsTotal: number;
}

export function checkStart(draft: StartDraft, context: StartContext): StartCheck {
  if (!context.canSet) return { ok: true, body: {} };
  const startsOn = draft.alreadyStarted ? draft.past : draft.day;
  const alreadyStarted = draft.alreadyStarted ? true : undefined;
  const result = salesStartDate({ startsOn, alreadyStarted, canSet: true, today: context.today });
  if (!result.ok) return { ok: false, error: t.salesMoney.error[result.code] };
  if (!alreadyStarted) return { ok: true, body: { startsOn: result.startsOn } };
  const lessonsUsedBefore = usedBeforeOf(draft, context.lessonsTotal);
  const problem = usedBeforeProblem({ lessonsUsedBefore, startsOn: result.startsOn, today: context.today, canSet: true, lessonsTotal: context.lessonsTotal });
  if (problem) return { ok: false, error: t.salesMoney.error[problem] };
  return { ok: true, body: { startsOn: result.startsOn, alreadyStarted, ...(lessonsUsedBefore > 0 ? { lessonsUsedBefore } : {}) } };
}
