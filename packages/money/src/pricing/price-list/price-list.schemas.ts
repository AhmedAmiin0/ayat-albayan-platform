import { z } from 'zod';
import { PRICING_DURATIONS } from '../catalog';
import { CURRENCY_ISOS, SITE_COUNTRIES } from '../currency';
import { fxRateSchema, quoteSchema } from '../quote/quote.schemas';

const groupSchema = z.object({
  duration: z.literal(PRICING_DURATIONS),
  /** The packages priced per duration, in site order; weekly is not one of them. */
  packages: z.array(quoteSchema),
});
export type PriceListGroup = z.infer<typeof groupSchema>;

/** Every package price of one country for one choice of students, discount and rounding. */
export const priceListSchema = z.object({
  /** One of the site's countries, or null (listed in USD). */
  country: z.enum(SITE_COUNTRIES).nullable(),
  currency: z.enum(CURRENCY_ISOS),
  students: z.number(),
  discount: z.number(),
  groups: z.array(groupSchema),
  /** Its lesson is always 90 minutes, so it has one price and no group. */
  weekly: quoteSchema,
});
export type PriceList = z.infer<typeof priceListSchema>;

/** GET /pricing/list: the list, and the rate a USD list used (null for the site's currencies). */
export const priceListResponseSchema = priceListSchema.extend({ fx: fxRateSchema.nullable() });
export type PriceListResponse = z.infer<typeof priceListResponseSchema>;
