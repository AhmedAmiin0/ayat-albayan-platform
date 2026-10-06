import type { PostgrestError } from '@supabase/supabase-js';
import { badRequest, conflict, notFound } from '../scheduling/errors';
import { dbError } from '../teachers/http';

const BAD = new Set([
  'invalid_month',
  'invalid_amount',
  'reason_required',
  'invalid_assistant',
  'commission_start_in_past',
  'commission_start_earlier',
  'salary_start_in_past',
  'salary_start_earlier',
]);
const MISSING = new Set(['assistant_not_found', 'statement_not_found', 'commission_not_found', 'student_not_found']);
const CONFLICT = new Set([
  'invalid_transition',
  'empty_statement',
  'reversal_in_later_statement',
  'already_voided',
  'commission_exists',
]);

/** `raise exception '<code>'` of migrations 20261006000272 / 273 → HTTP; anything else is a plain DB error. */
export function assistantError(error: PostgrestError): Error {
  if (error.code === 'P0001') {
    if (BAD.has(error.message)) return badRequest(error.message);
    if (MISSING.has(error.message)) return notFound(error.message);
    if (CONFLICT.has(error.message)) return conflict(error.message);
  }
  return dbError(error);
}
