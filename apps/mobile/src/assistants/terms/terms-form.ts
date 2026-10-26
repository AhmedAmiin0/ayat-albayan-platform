import {
  assistantTermsSchema,
  CURRENCY_ISOS,
  earliestTermStart,
  RIYADH_TZ,
  termStartError,
  type AssistantCommissionType,
  type AssistantTermsInput,
  type AssistantTermsView,
} from '@ab/shared';
import { localDate } from '@/today/lib/timeline';

// The web's terms-form.ts on the phone: the same state, the same shared schema, the same start-day rule.

/** The terms editor's state: every field a string, so half-typed input never throws. */
export type TermsForm = {
  salaryAmount: string;
  salaryCurrency: string;
  salaryStartsOn: string;
  commType: '' | AssistantCommissionType;
  commValue: string;
  commCurrency: string;
  commStartsOn: string;
};
export type TermsField = keyof TermsForm;
/** Error keys of t.assistants.error, per field. */
export type TermsErrors = Partial<Record<TermsField, string>>;

/** Teacher money and the owner's tracker are in EGP: the default for a new term. */
export const DEFAULT_CURRENCY = 'EGP';
/** The academy pays in EGP; the site currencies follow (web CurrencySelect). */
export const TERM_CURRENCIES: readonly string[] = [...new Set([DEFAULT_CURRENCY, ...CURRENCY_ISOS])];

/** Today in Riyadh, YYYY-MM-DD (the web's paidAtDay). */
export const todayDay = (now: Date = new Date()): string => localDate(now, RIYADH_TZ);

export function formOf(terms: AssistantTermsView | null, today = todayDay()): TermsForm {
  const { salary, commission } = terms ?? { salary: null, commission: null };
  return {
    salaryAmount: salary ? String(salary.amount) : '',
    salaryCurrency: salary?.currency ?? DEFAULT_CURRENCY,
    salaryStartsOn: salary?.starts_on ?? today,
    commType: commission?.type ?? '',
    commValue: commission ? String(commission.value) : '',
    commCurrency: commission?.currency ?? DEFAULT_CURRENCY,
    commStartsOn: commission?.starts_on ?? today,
  };
}

const num = (s: string) => (s.trim() === '' ? Number.NaN : Number(s.trim()));

// The schema's path → the form field it belongs to.
const FIELD_OF: Record<string, TermsField> = {
  'salary.amount': 'salaryAmount',
  'salary.currency': 'salaryCurrency',
  'salary.startsOn': 'salaryStartsOn',
  'commission.value': 'commValue',
  'commission.currency': 'commCurrency',
  'commission.startsOn': 'commStartsOn',
};

/** What the start days are checked against: the saved terms (null = none yet) and today (YYYY-MM-DD, Riyadh). */
export type TermsRules = { current: AssistantTermsView | null; today: string };

/** The earliest start day each part accepts now: its saved day, or today for a part that is not set yet. */
export const startMins = ({ current, today }: TermsRules) => ({
  salary: earliestTermStart(current?.salary?.starts_on, today),
  commission: earliestTermStart(current?.commission?.starts_on, today),
});

const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Nothing is retroactive (termStartError, as the API's RPC): keys of t.assistants.error, per start field. */
function startErrors(f: TermsForm, { current, today }: TermsRules): TermsErrors {
  const out: TermsErrors = {};
  const salary = f.salaryAmount.trim() !== '' && isDay(f.salaryStartsOn) ? termStartError(f.salaryStartsOn, current?.salary?.starts_on, today) : null;
  if (salary) out.salaryStartsOn = `salary_${salary}`;
  const commission = f.commType !== '' && isDay(f.commStartsOn) ? termStartError(f.commStartsOn, current?.commission?.starts_on, today) : null;
  if (commission) out.commStartsOn = `commission_${commission}`;
  return out;
}

/**
 * Form → the PUT body. An empty salary amount or no commission type clears that part. Validation is
 * the shared schema (percent ≤ 100 and no currency, fixed needs one, two decimals) and, with `rules`,
 * the start-day rule, so the API agrees.
 */
export function toInput(f: TermsForm, rules?: TermsRules): { value: AssistantTermsInput } | { errors: TermsErrors } {
  const salary = f.salaryAmount.trim() === '' ? null : { amount: num(f.salaryAmount), currency: f.salaryCurrency, startsOn: f.salaryStartsOn };
  const commission =
    f.commType === ''
      ? null
      : { type: f.commType, value: num(f.commValue), currency: f.commType === 'fixed' ? f.commCurrency : null, startsOn: f.commStartsOn };
  const parsed = assistantTermsSchema.safeParse({ salary, commission });
  const errors: TermsErrors = rules ? startErrors(f, rules) : {};
  if (parsed.success && Object.keys(errors).length === 0) return { value: parsed.data };
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = FIELD_OF[issue.path.join('.')];
      if (field && !errors[field]) errors[field] = issue.message;
    }
  }
  return { errors };
}

/** `2026-10-31` + 1 → `2026-11-01`; months clamp to the last day (`2026-01-31` + 1 month → `2026-02-28`). */
export function shiftDay(day: string, step: { days?: number; months?: number }): string {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  const months = step.months ?? 0;
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  const at = new Date(Date.UTC(y, m - 1 + months, Math.min(d, last) + (step.days ?? 0)));
  return at.toISOString().slice(0, 10);
}
