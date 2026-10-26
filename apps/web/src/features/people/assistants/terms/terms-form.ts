import { termsFormOf, type TermsForm } from '@ab/client-core';
import type { AssistantTermsView } from '@ab/shared';
import { paidAtDay } from '@/features/finance/payments/record/pay-day';

// The terms form lives in @ab/client-core (docs/27 E5), shared with the mobile app; this module keeps the web's names
// and its default "today" (paidAtDay, Riyadh).
export {
  TERMS_DEFAULT_CURRENCY as DEFAULT_CURRENCY,
  termStartMins as startMins,
  termsToInput as toInput,
  type TermsErrors,
  type TermsField,
  type TermsForm,
  type TermsRules,
} from '@ab/client-core';

export function formOf(terms: AssistantTermsView | null, today = paidAtDay()): TermsForm {
  return termsFormOf(terms, today);
}
