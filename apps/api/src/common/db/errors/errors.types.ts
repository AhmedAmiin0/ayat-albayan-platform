import type { PostgrestError } from '@supabase/supabase-js';

export type ToError = (error: PostgrestError) => Error;

/** A failed query's error to the HTTP answer, checked in field order before the default map. */
export interface PgErrorMap {
  /** By the constraint named in the message, e.g. a unique index. */
  readonly constraints?: Readonly<Record<string, ToError>>;
  /** By the text a database function raised (SQLSTATE P0001). */
  readonly raised?: Readonly<Record<string, ToError>>;
  /** By SQLSTATE or PostgREST code. */
  readonly codes?: Readonly<Record<string, ToError>>;
  /** Replaces the default's last branch, the plain 500. */
  readonly otherwise?: ToError;
}

export type DbResult<T> = { data: T; error: null } | { data: null; error: PostgrestError };
export interface DbStatus {
  error: PostgrestError | null;
}
