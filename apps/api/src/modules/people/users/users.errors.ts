import { conflict } from '@/common/http/errors';
import type { PostgrestError } from '@supabase/supabase-js';
import { pgError } from '@/common/db/errors';

type DbFailure = PostgrestError;

/** A unique violation on a phone is the admin's mistake (409 phone_taken), not a server error. */
export function phoneAware(error: DbFailure): Error {
  return error.code === '23505' ? conflict('phone_taken') : pgError(error);
}

/**
 * A profiles write that can take the last system admin away: when the API's own check lost a race,
 * the database backstop (migration 287) raises P0001 'last_admin' at commit.
 */
export function guardedError(error: DbFailure): Error {
  return error.code === 'P0001' && error.message === 'last_admin' ? conflict('last_admin') : phoneAware(error);
}
