import type { PostgrestError } from '@supabase/supabase-js';
import { badRequest, conflict, notFound } from '@/common/http/errors';
import { pgError, raisedAs, type PgErrorMap } from '@/common/db/errors';

/** `raise exception '<code>'` of migrations 178 / 20261005000201 → HTTP; anything else is a plain DB error. */
const LEDGER_ERRORS: PgErrorMap = {
  raised: {
    ...raisedAs(['allocation_mismatch', 'allocation_invalid'], badRequest),
    ...raisedAs(['overpayment', 'already_voided', 'invalid_transition'], conflict),
    ...raisedAs(['earning_not_found', 'payout_not_found', 'payment_not_found'], notFound),
  },
};

export const ledgerError = (error: PostgrestError): Error => pgError(error, LEDGER_ERRORS);
