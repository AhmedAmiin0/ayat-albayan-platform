import type { PostgrestError } from '@supabase/supabase-js';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { pgError, raisedAs, type PgErrorMap } from '@/common/db/errors';

const BAD = [
  'invalid_month',
  'invalid_amount',
  'reason_required',
  'invalid_assistant',
  'commission_start_in_past',
  'commission_start_earlier',
  'salary_start_in_past',
  'salary_start_earlier',
];
const MISSING = [
  'assistant_not_found',
  'statement_not_found',
  'commission_not_found',
  'student_not_found',
];
const CONFLICT = [
  'invalid_transition',
  'empty_statement',
  'reversal_in_later_statement',
  'already_voided',
  'commission_exists',
];

/** `raise exception '<code>'` of migrations 20261006000272 / 273 → HTTP; anything else is a plain DB error. */
const ASSISTANT_ERRORS: PgErrorMap = {
  raised: {
    ...raisedAs(BAD, badRequest),
    ...raisedAs(MISSING, notFound),
    ...raisedAs(CONFLICT, conflict),
  },
};

export const assistantError = (error: PostgrestError): Error => pgError(error, ASSISTANT_ERRORS);
