import { BadRequestException, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

// ponytail: module-local; lift to common/ once a second module needs the same helpers.

/** Validates with a shared zod schema → 400 `{ message: 'validation_failed', issues }`. */
export function parseOrThrow<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issues = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  throw new BadRequestException({ message: 'validation_failed', issues });
}

/**
 * Keeps only the keys the client actually sent. Shared `*UpdateSchema = create.partial()` still
 * applies defaults (a PATCH of the name alone would reset `status` to 'active').
 */
export function sentOnly<T extends object>(parsed: T, body: unknown): Partial<T> {
  const sent = new Set(body !== null && typeof body === 'object' ? Object.keys(body) : []);
  return Object.fromEntries(Object.entries(parsed).filter(([k]) => sent.has(k))) as Partial<T>;
}

export function orNotFound<T>(row: T | null): T {
  if (row === null) throw new NotFoundException();
  return row;
}

/** `?page=1&pageSize=25` (R-NFR-08: every list endpoint is paginated). */
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type PageQuery = z.output<typeof pageQuerySchema>;
