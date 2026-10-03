import type { PostgrestError } from '@supabase/supabase-js';
import { badRequest, conflict, notFound } from '../scheduling/errors';
import { dbError } from '../teachers/http';

/** `raise exception '<code>'` of migration 178 → HTTP; anything else is a plain DB error. */
export function ledgerError(error: PostgrestError): Error {
  if (error.code === 'P0001') {
    if (error.message === 'overpayment') return conflict('overpayment');
    if (error.message === 'allocation_mismatch' || error.message === 'allocation_invalid') return badRequest(error.message);
    if (error.message === 'earning_not_found') return notFound('earning_not_found');
    if (error.message === 'payout_not_found') return notFound('payout_not_found');
  }
  return dbError(error);
}
