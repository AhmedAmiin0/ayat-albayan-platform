import {
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DEFAULT_DURATION,
  DISCOUNT_MAX,
  PACKAGE_IDS,
  PRICING_DURATIONS,
  STUDENTS_MAX,
  STUDENTS_MIN,
} from '@ab/shared';
import { z } from 'zod';

// Query strings for /pricing (docs/08 §3). Everything arrives as text, hence the coercion.
const shape = {
  /** ISO 3166 alpha-2; omitted or not a site country → quoted in USD. */
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((c) => c.toUpperCase())
    .optional(),
  duration: z.coerce.number().pipe(z.literal(PRICING_DURATIONS)).default(DEFAULT_DURATION),
};
const quoteShape = {
  ...shape,
  students: z.coerce.number().int().min(STUDENTS_MIN).max(STUDENTS_MAX).default(STUDENTS_MIN),
  /** Percent: the site's 0/5/10/15 pills or its free field (any number 0–100). */
  discount: z.coerce.number().min(0).max(DISCOUNT_MAX).default(0),
};

export const catalogQuery = z.object(shape);
export type CatalogQuery = z.output<typeof catalogQuery>;

/** Exactly one of `tier` (a package id) or `count` (custom lesson count). */
export const quoteQuery = z.union([
  z.object({ ...quoteShape, tier: z.enum(PACKAGE_IDS), count: z.undefined().optional() }),
  z.object({
    ...quoteShape,
    tier: z.undefined().optional(),
    count: z.coerce.number().int().min(CUSTOM_COUNT_MIN).max(CUSTOM_COUNT_MAX),
  }),
]);
export type QuoteQuery = z.output<typeof quoteQuery>;
