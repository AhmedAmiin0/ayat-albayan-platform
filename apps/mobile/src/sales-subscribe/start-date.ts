import { salesStartDate } from '@ab/shared';
import { t } from '@/lib/i18n';

// The sales subscribe's first day (owner 2026-10-12, docs/16 row 24). Pure. Without
// subscriptions.set_start_date nothing is asked or sent (the API starts the package on today). With it:
// the day chips, or «بدأ الاشتراك سابقًا» and a typed past day down to a year back (salesStartDate,
// the API's own rule, so its 400 shows before posting).

export interface StartDraft {
  /** The chip picked (local YYYY-MM-DD). */
  day: string;
  /** «بدأ الاشتراك سابقًا» is on. */
  alreadyStarted: boolean;
  /** The typed day while it is on (YYYY-MM-DD, any digits). */
  typed: string;
}

/** What POST /sales/subscriptions gets: nothing, a day, or a past day with alreadyStarted. */
export type StartBody = { startsOn?: string; alreadyStarted?: true };
export type StartCheck = { ok: true; body: StartBody } | { ok: false; error: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Arabic-Indic / Persian digits to Western, a real calendar day, else null. */
export function typedDay(text: string): string | null {
  const day = text
    .trim()
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  if (!DAY.test(day)) return null;
  const parsed = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day ? day : null;
}

/** `today`: the academy's (Riyadh) day, as the API checks it. */
export function checkStart(draft: StartDraft, context: { canSet: boolean; today: string }): StartCheck {
  if (!context.canSet) return { ok: true, body: {} };
  const startsOn = draft.alreadyStarted ? typedDay(draft.typed) : draft.day;
  if (startsOn === null) return { ok: false, error: t.salesMoney.startedOnInvalid };
  const alreadyStarted = draft.alreadyStarted ? true : undefined;
  const result = salesStartDate({ startsOn, alreadyStarted, canSet: true, today: context.today });
  if (!result.ok) return { ok: false, error: t.salesMoney.error[result.code] };
  return { ok: true, body: alreadyStarted ? { startsOn: result.startsOn, alreadyStarted } : { startsOn: result.startsOn } };
}
