import type { PostgrestError } from '@supabase/supabase-js';
import type { Orderable } from '@/common/db/list-sort';

export interface PageRows<Row> {
  rows: Row[];
  total: number;
}

export type CountedResult<Row> = (
  | { data: Row[]; error: null }
  | { data: null; error: PostgrestError }
) & { count: number | null };

/** A supabase-js select built with `{ count: 'exact' }`; structural so a test fake fits. */
export interface Pageable<Row> extends Orderable<Pageable<Row>> {
  range(from: number, to: number): PromiseLike<CountedResult<Row>>;
}

export interface AtId {
  at: string;
  id: string;
}

/**
 * The keyset column, the unique column breaking its ties (`id` by default), the direction and
 * whether the cursor row itself belongs to the page.
 */
export interface KeysetSpec {
  column: string;
  key?: string;
  ascending: boolean;
  inclusive?: boolean;
}

export interface Keyset<Q> extends Orderable<Q> {
  gte(column: string, value: string): Q;
  lte(column: string, value: string): Q;
  or(filters: string): Q;
}
