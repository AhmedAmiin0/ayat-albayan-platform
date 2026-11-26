import { pageWindow, type ListSort, type Page, type PageInput } from '@ab/core';
import { applySort, type SortSpec } from '@/common/db/list-sort';
import { done, rows } from '@/common/db/errors';
import type { CountedResult, PageRows, Pageable } from './page.types';

/** Rows read by an RPC or in memory, in the `Page<T>` envelope. */
export function toPage<T>(items: T[], total: number, input: PageInput): Page<T> {
  return { items, total, page: input.page, pageSize: input.pageSize };
}

/** PostgREST answers a window past the last row with PGRST103 instead of an empty list. */
const isPastEnd = (res: CountedResult<unknown>): boolean => res.error?.code === 'PGRST103';

async function totalOf<Row>(query: () => Pageable<Row>): Promise<number> {
  const res = await query().range(0, 0);
  done(res);
  return res.count ?? 0;
}

/**
 * One sorted page of `query()` and its exact count; past the end an empty page and the real
 * total, so a client can step back (docs/62 §2). The route keeps its own envelope.
 */
export async function readPage<Row, K extends string>(
  query: () => Pageable<Row>,
  input: PageInput & ListSort<K>,
  sort: SortSpec<K>,
): Promise<PageRows<Row>> {
  const { from, to } = pageWindow(input);
  const res = await applySort(query(), input, sort).range(from, to);
  if (isPastEnd(res)) return { rows: [], total: await totalOf(query) };
  return { rows: rows(res), total: res.count ?? 0 };
}
