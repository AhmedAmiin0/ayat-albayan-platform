import {
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DEFAULT_DURATION,
  DISCOUNT_MAX,
  PACKAGE_IDS,
  PRICING_DURATIONS,
  roundingSchema,
  STUDENTS_MAX,
  STUDENTS_MIN,
} from '@ab/money';
import { clientRequestId } from '@ab/core';
import { z } from 'zod';

// Query strings of GET /pricing/* (docs/08 §3): everything arrives as text, hence the coercion.
/** ISO 3166 alpha-2; omitted or not a site country → quoted in USD. */
const country = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/)
  .transform((c) => c.toUpperCase())
  .optional();
const shape = {
  country,
  duration: z.coerce.number().pipe(z.literal(PRICING_DURATIONS)).default(DEFAULT_DURATION),
};
const priced = {
  students: z.coerce.number().int().min(STUDENTS_MIN).max(STUDENTS_MAX).default(STUDENTS_MIN),
  /** Percent: the site's 0/5/10/15 pills or its free field (any number 0–100). */
  discount: z.coerce.number().min(0).max(DISCOUNT_MAX).default(0),
  /**
   * Left out means nearest. Optional rather than defaulted: a subscription builds this query
   * without it, and its price must stay the calculator's.
   */
  rounding: roundingSchema.optional(),
};
const quoteShape = { ...shape, ...priced };

export const catalogQuerySchema = z.object(shape);
export type CatalogQuery = z.output<typeof catalogQuerySchema>;
export type CatalogQueryInput = z.input<typeof catalogQuerySchema>;

/** Exactly one of `tier` (a package id) or `count` (custom lesson count). */
export const quoteQuerySchema = z.union([
  z.object({ ...quoteShape, tier: z.enum(PACKAGE_IDS), count: z.undefined().optional() }),
  z.object({
    ...quoteShape,
    tier: z.undefined().optional(),
    count: z.coerce.number().int().min(CUSTOM_COUNT_MIN).max(CUSTOM_COUNT_MAX),
  }),
]);
export type QuoteQuery = z.output<typeof quoteQuerySchema>;
export type QuoteQueryInput = z.input<typeof quoteQuerySchema>;

/** The whole list has every duration and package, so only the country and the pricing choice. */
export const priceListQuerySchema = z.object({ country, ...priced });
export type PriceListQueryParams = z.output<typeof priceListQuerySchema>;
export type PriceListQueryInput = z.input<typeof priceListQuerySchema>;

/**
 * POST /pricing/list-pdf: the list's choice plus the chat file's request id, so the PDF is stored
 * where a chat file of that request goes and the chat's own file send can queue it.
 */
export const priceListPdfBodySchema = priceListQuerySchema.extend({ clientRequestId });
export type PriceListPdfBody = z.output<typeof priceListPdfBodySchema>;
export type PriceListPdfBodyInput = z.input<typeof priceListPdfBodySchema>;

export const priceListPdfResponseSchema = z.object({
  /** The wa-media path the chat file send takes. */
  path: z.string(),
  /** A short-lived link to open the PDF before it is sent. */
  url: z.url(),
  /** The name the family sees in the chat. */
  filename: z.string(),
});
export type PriceListPdfResponse = z.infer<typeof priceListPdfResponseSchema>;
