import { z } from 'zod';
import type { PageQueryShape, PageSchema, PageSize } from './page.types';

const count = (): z.ZodNumber => z.number().int();

/** Past this page an offset read only costs the database; a query may set a lower last page. */
export const MAX_PAGE = 10_000;

/** Spread into a list query: `z.object({ ...pageQuery({ size: 25 }), ...listSortShape(KEYS) })`. */
export function pageQuery(size: PageSize): PageQueryShape {
  const { max = 100, lastPage = MAX_PAGE } = size;
  return {
    page: z.coerce.number().int().min(1).max(lastPage).default(1),
    pageSize: z.coerce.number().int().min(1).max(max).default(size.size),
  };
}

/** The answer of a list endpoint that returns `Page<T>`. */
export function pageOf<T extends z.ZodType>(item: T): PageSchema<T> {
  return z.object({ items: z.array(item), total: count(), page: count(), pageSize: count() });
}
