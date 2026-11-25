import { z } from 'zod';
import type { PageQueryShape, PageSchema, PageSize } from './page.types';

const count = (): z.ZodNumber => z.number().int();

/** Spread into a list query: `z.object({ ...pageQuery({ size: 25 }), ...listSortShape(KEYS) })`. */
export function pageQuery(size: PageSize): PageQueryShape {
  const { max = 100, lastPage = Number.MAX_SAFE_INTEGER } = size;
  return {
    page: z.coerce.number().int().min(1).max(lastPage).default(1),
    pageSize: z.coerce.number().int().min(1).max(max).default(size.size),
  };
}

/** The answer of a list endpoint that returns `Page<T>`. */
export function pageOf<T extends z.ZodType>(item: T): PageSchema<T> {
  return z.object({ items: z.array(item), total: count(), page: count(), pageSize: count() });
}
