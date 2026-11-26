import { NotFoundException } from '@nestjs/common';
import { pgError } from './pg-error';
import type { DataOf, DbResult, DbStatus, PgErrorMap } from './errors.types';

/** The rows of a list read; a failed query throws its mapped answer. */
export function rows<R extends DbResult<unknown[]>>(res: R, map?: PgErrorMap): DataOf<R> {
  return maybe(res, map);
}

/** The one row a read must find: no row answers 404. */
export function one<R extends DbResult<unknown>>(res: R, map?: PgErrorMap): NonNullable<DataOf<R>> {
  const row = maybe(res, map);
  if (row === null || row === undefined) throw new NotFoundException();
  return row;
}

/** The row, or null when none matched. */
export function maybe<R extends DbResult<unknown>>(res: R, map?: PgErrorMap): DataOf<R> {
  if (res.error !== null) throw pgError(res.error, map);
  return res.data as DataOf<R>;
}

/** A write whose data nobody reads. */
export function done(res: DbStatus, map?: PgErrorMap): void {
  if (res.error !== null) throw pgError(res.error, map);
}
