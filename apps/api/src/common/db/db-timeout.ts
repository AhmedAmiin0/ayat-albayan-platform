import { z } from 'zod';

/** Default deadline of one database call (DB_TIMEOUT_MS overrides it). */
export const DB_TIMEOUT_DEFAULT_MS = 15_000;

/**
 * A database call that did not answer in time (DB_TIMEOUT_MS). `code: 'ABORT_ERR'` makes
 * postgrest-js treat it as an abort: never retried (a retry would only wait again). It comes back
 * as `{ error }` whose message starts «DbTimeoutError:», which repos throw like any database error.
 */
export class DbTimeoutError extends Error {
  override readonly name = 'DbTimeoutError';
  readonly code = 'ABORT_ERR';

  constructor(ms: number) {
    super(`database call timed out after ${ms} ms`);
  }
}

const withMessage = z.object({ message: z.string() });

/** The typed error, or an error (thrown or returned) carrying its message. */
export function isDbTimeout(e: unknown): boolean {
  if (e instanceof DbTimeoutError) return true;
  const parsed = withMessage.safeParse(e);
  return parsed.success && parsed.data.message.includes('DbTimeoutError');
}
