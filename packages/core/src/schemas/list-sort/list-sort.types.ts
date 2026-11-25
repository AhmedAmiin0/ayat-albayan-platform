import type { z } from 'zod';

/** The `sort` / `dir` fields listSortShape spreads into a list query schema. */
export interface ListSortShape<K extends string> {
  sort: z.ZodOptional<z.ZodEnum<{ [V in K]: V }>>;
  dir: z.ZodOptional<z.ZodEnum<{ asc: 'asc'; desc: 'desc' }>>;
}
