import { z } from 'zod';
import { PACKAGE_IDS } from '../catalog';
import { CURRENCY_ISOS, SITE_COUNTRIES } from '../currency';

// The wire shapes of GET /pricing/*: no transform and no default, so a parsed answer is the
// answer. `quoteSchema` mirrors `Quote`, which a type test holds it to.

export const fxRateSchema = z.object({
  quote: z.string(),
  rate: z.number(),
  date: z.string().nullable(),
  provider: z.string(),
  fallback: z.boolean(),
  ageHours: z.number().nullable(),
});
/** The rate a USD quote used, sent with every USD price to reproduce it (docs/08 §4). */
export type FxRate = z.infer<typeof fxRateSchema>;

export const quoteSchema = z.object({
  package: z.enum([...PACKAGE_IDS, 'custom']),
  lessons: z.number(),
  duration: z.number(),
  country: z.enum(SITE_COUNTRIES).nullable(),
  currency: z.enum(CURRENCY_ISOS),
  price: z.number(),
  students: z.number(),
  total: z.number(),
  discount: z.number(),
  afterDiscount: z.number(),
  perLesson: z.number(),
  insteadOf: z.number().nullable(),
  savingsPct: z.number().nullable(),
  popular: z.boolean(),
  featured: z.boolean(),
});

/** GET /pricing/quote: the quote and the rate a USD price used (null for the site's currencies). */
export const quoteResponseSchema = quoteSchema.extend({ fx: fxRateSchema.nullable() });
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;

/** GET /pricing/catalog: all six packages of one duration, one student, no discount. */
export const catalogResponseSchema = z.object({
  country: z.enum(SITE_COUNTRIES).nullable(),
  currency: z.enum(CURRENCY_ISOS),
  duration: z.number(),
  packages: z.array(quoteSchema),
  fx: fxRateSchema.nullable(),
});
export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
