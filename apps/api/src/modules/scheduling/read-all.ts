import type { PostgrestError } from '@supabase/supabase-js';
import { dbError } from '../teachers/http';

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
