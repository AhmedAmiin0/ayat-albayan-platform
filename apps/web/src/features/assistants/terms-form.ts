import { assistantTermsSchema, type AssistantCommissionType, type AssistantTermsInput, type AssistantTermsView } from '@ab/shared';
import { paidAtDay } from '@/features/payments/pay-day';

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

export function formOf(terms: AssistantTermsView | null, today = paidAtDay()): TermsForm {
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

// The schema's path (+ message) → the form field it belongs to.
const FIELD_OF: Record<string, TermsField> = {
  'salary.amount': 'salaryAmount',
  'salary.currency': 'salaryCurrency',
  'salary.startsOn': 'salaryStartsOn',
  'commission.value': 'commValue',
  'commission.currency': 'commCurrency',
  'commission.startsOn': 'commStartsOn',
};

/**
 * Form → the PUT body. An empty salary amount or no commission type clears that part. Validation is
 * the shared schema (percent ≤ 100 and no currency, fixed needs one, two decimals), so the API agrees.
 */
export function toInput(f: TermsForm): { value: AssistantTermsInput } | { errors: TermsErrors } {
  const salary = f.salaryAmount.trim() === '' ? null : { amount: num(f.salaryAmount), currency: f.salaryCurrency, startsOn: f.salaryStartsOn };
  const commission =
    f.commType === ''
      ? null
      : {
          type: f.commType,
          value: num(f.commValue),
          currency: f.commType === 'fixed' ? f.commCurrency : null,
          startsOn: f.commStartsOn,
        };
  const parsed = assistantTermsSchema.safeParse({ salary, commission });
  if (parsed.success) return { value: parsed.data };
  const errors: TermsErrors = {};
  for (const issue of parsed.error.issues) {
    const field = FIELD_OF[issue.path.join('.')];
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { errors };
}
