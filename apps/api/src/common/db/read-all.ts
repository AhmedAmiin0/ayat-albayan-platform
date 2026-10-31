import type { PostgrestError } from '@supabase/supabase-js';
import { dbError } from '@/common/http/http';

/** PostgREST `max_rows` (packages/db/supabase/config.toml): longer results are cut silently. */
export const MAX_ROWS = 1000;

type PageResult<T> = { data: T[] | null; error: PostgrestError | null };

/**
 * Reads a whole list range by range so a long result is never truncated at max_rows.
 * `page(from, to)` must apply a total order (e.g. starts_at, id) and `.range(from, to)`.
 */
export async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += MAX_ROWS) {
    const { data, error } = await page(from, from + MAX_ROWS - 1);
    if (error) throw dbError(error);
    out.push(...(data ?? []));
    if (!data || data.length < MAX_ROWS) return out;
  }
}

/** Ids per `.in()` request: the list goes into the URL, and ~200 uuids already get HTTP 414. */
export const IN_CHUNK = 100;

/**
 * `read(chunk)` for every IN_CHUNK ids, results concatenated in chunk order (so rows of one id
 * keep their order). ponytail: one chunk is assumed to fit in max_rows.
 */
export async function readChunked<T>(
  ids: readonly string[],
  read: (chunk: string[]) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await read(ids.slice(i, i + IN_CHUNK));
    if (error) throw dbError(error);
    out.push(...(data ?? []));
  }
  return out;
}
