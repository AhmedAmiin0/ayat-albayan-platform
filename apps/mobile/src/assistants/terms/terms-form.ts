import { termsFormOf, TERMS_DEFAULT_CURRENCY, type TermsForm } from '@ab/client-core';
import { addCalendarDays, CURRENCY_ISOS, RIYADH_TZ, shiftCalendarMonths, type AssistantTermsView } from '@ab/shared';
import { localDate } from '@/today/lib/timeline';

// The web's terms-form.ts on the phone: the state, schema and start-day rule live in @ab/client-core (docs/27 E5);
// this module keeps the phone's names, its default "today" and the phone-only helpers.
export {
  TERMS_DEFAULT_CURRENCY as DEFAULT_CURRENCY,
  termStartMins as startMins,
  termsToInput as toInput,
  type TermsErrors,
  type TermsField,
  type TermsForm,
  type TermsRules,
} from '@ab/client-core';

/** The academy pays in EGP; the site currencies follow (web CurrencySelect). */
export const TERM_CURRENCIES: readonly string[] = [...new Set([TERMS_DEFAULT_CURRENCY, ...CURRENCY_ISOS])];

/** Today in Riyadh, YYYY-MM-DD (the web's paidAtDay). */
// academy day (docs/34 b): terms start on an academy day.
export const todayDay = (now: Date = new Date()): string => localDate(now, RIYADH_TZ);

export function formOf(terms: AssistantTermsView | null, today = todayDay()): TermsForm {
  return termsFormOf(terms, today);
}

/** `2026-10-31` + 1 → `2026-11-01`; months clamp to the last day (`2026-01-31` + 1 month → `2026-02-28`). */
export function shiftDay(day: string, step: { days?: number; months?: number }): string {
  return addCalendarDays(shiftCalendarMonths(day, step.months ?? 0), step.days ?? 0);
}
