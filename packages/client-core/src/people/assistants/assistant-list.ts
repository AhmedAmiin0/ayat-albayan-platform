import type { AssistantTermsView, PayoutStatus } from '@ab/shared';

// The «المساعدون» screens of web and mobile (apps/api assistant-pay).

/** One assistant of the list: GET /assistant-pay/terms reshaped to the profile and its terms. */
export interface AssistantRow {
  id: string;
  name: string;
  terms: AssistantTermsView;
}

/** The commission ledger's filters: '' = any; the month becomes from/to instants. */
export interface LedgerFilter {
  assistantId: string;
  month: string;
  status: '' | 'earned' | 'voided';
}

/** The statements' filters (GET /assistant-pay/statements): '' = any. */
export interface StatementFilter {
  assistantId: string;
  month: string;
  status: '' | PayoutStatus;
}
