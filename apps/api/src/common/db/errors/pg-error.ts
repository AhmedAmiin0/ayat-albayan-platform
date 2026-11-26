import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import type { PgErrorMap, ToError } from './errors.types';

const DEFAULT_CODES: Readonly<Record<string, ToError>> = {
  '23505': (e) => new ConflictException({ message: 'duplicate', detail: e.details }),
  '23503': (e) => new ConflictException({ message: 'fk_violation', detail: e.details }),
  PGRST103: () => new BadRequestException({ message: 'page_out_of_range' }),
};

/** Nest answers a plain Error as 500. */
const plainError: ToError = (e) => new Error(`db error ${e.code}: ${e.message}`);

const own = (table: Readonly<Record<string, ToError>> | undefined, key: string | undefined) =>
  table !== undefined && key !== undefined && Object.hasOwn(table, key) ? table[key] : undefined;

const constraintOf = (error: PostgrestError) => /constraint "([^"]+)"/.exec(error.message)?.[1];
const raisedOf = (error: PostgrestError) => (error.code === 'P0001' ? error.message : undefined);

function mapped(error: PostgrestError, map: PgErrorMap): ToError | undefined {
  return (
    own(map.constraints, constraintOf(error)) ??
    own(map.raised, raisedOf(error)) ??
    own(map.codes, error.code) ??
    own(DEFAULT_CODES, error.code)
  );
}

/** The one Postgres / PostgREST error → HTTP path: the local map, then the default. */
export function pgError(error: PostgrestError, map: PgErrorMap = {}): Error {
  const toError = mapped(error, map) ?? map.otherwise ?? plainError;
  return toError(error);
}

export function uniqueViolationOn(error: PostgrestError, constraint: string): boolean {
  return error.code === '23505' && constraintOf(error) === constraint;
}
