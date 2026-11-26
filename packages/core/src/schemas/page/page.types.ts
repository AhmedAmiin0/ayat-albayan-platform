import type { z } from 'zod';

/** One page of a list endpoint (`?page&pageSize`, R-NFR-08): the rows and the full count. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** An endpoint's page size: its default, its maximum, and a last page below MAX_PAGE. */
export interface PageSize {
  size: number;
  max?: number;
  lastPage?: number;
}

/** The `page` / `pageSize` fields pageQuery spreads into a list query schema. */
export interface PageQueryShape {
  page: z.ZodDefault<z.ZodCoercedNumber>;
  pageSize: z.ZodDefault<z.ZodCoercedNumber>;
}

export type PageSchema<T extends z.ZodType> = z.ZodObject<{
  items: z.ZodArray<T>;
  total: z.ZodNumber;
  page: z.ZodNumber;
  pageSize: z.ZodNumber;
}>;
