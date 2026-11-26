import { conflict } from '@/common/http/errors';
import type { PostgrestError } from '@supabase/supabase-js';
import { pgError, type PgErrorMap, UNIQUE_VIOLATION } from '@/common/db/errors';

/** A unique violation on a phone is the admin's mistake (409 phone_taken), not a server error. */
const PHONE_ERRORS: PgErrorMap = { codes: { [UNIQUE_VIOLATION]: () => conflict('phone_taken') } };

/**
 * A profiles write that can take the last system admin away: when the API's own check lost a race,
 * the database backstop (migration 287) raises P0001 'last_admin' at commit.
 */
const GUARDED_ERRORS: PgErrorMap = {
  ...PHONE_ERRORS,
  raised: { last_admin: () => conflict('last_admin') },
};

export const phoneAware = (error: PostgrestError): Error => pgError(error, PHONE_ERRORS);

export const guardedError = (error: PostgrestError): Error => pgError(error, GUARDED_ERRORS);
