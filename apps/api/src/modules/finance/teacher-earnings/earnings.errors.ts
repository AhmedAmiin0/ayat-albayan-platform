import type { PostgrestError } from '@supabase/supabase-js';
import { badRequest, conflict, notFound } from '../../../common/http/errors';
import { dbError } from '../../../common/http/http';

const BAD = new Set(['allocation_mismatch', 'allocation_invalid']);
const CONFLICT = new Set(['overpayment', 'already_voided', 'invalid_transition']);
const MISSING = new Set(['earning_not_found', 'payout_not_found', 'payment_not_found']);

/** `raise exception '<code>'` of migrations 178 / 20261005000201 → HTTP; anything else is a plain DB error. */
export function ledgerError(error: PostgrestError): Error {
  if (error.code === 'P0001') {
    if (CONFLICT.has(error.message)) return conflict(error.message);
    if (BAD.has(error.message)) return badRequest(error.message);
    if (MISSING.has(error.message)) return notFound(error.message);
  }
  return dbError(error);
}
