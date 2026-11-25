import { NotFoundException } from '@nestjs/common';
import { pgError } from './pg-error';
import type { DbResult, DbStatus, PgErrorMap } from './errors.types';

/** The rows of a list read; a failed query throws its mapped answer. */
export function rows<T>(res: DbResult<T[]>, map?: PgErrorMap): T[] {
  if (res.error !== null) throw pgError(res.error, map);
  return res.data;
}

/** The one row a read must find: no row answers 404. */
export function one<T>(res: DbResult<T | null>, map?: PgErrorMap): T {
  const row = maybe(res, map);
  if (row === null) throw new NotFoundException();
  return row;
}

/** The row, or null when none matched. */
export function maybe<T>(res: DbResult<T | null>, map?: PgErrorMap): T | null {
  if (res.error !== null) throw pgError(res.error, map);
  return res.data;
}

/** A write whose data nobody reads. */
export function done(res: DbStatus, map?: PgErrorMap): void {
  if (res.error !== null) throw pgError(res.error, map);
}
