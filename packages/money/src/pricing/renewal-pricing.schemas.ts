import { z } from 'zod';
import {
  CUSTOM_COUNT_MAX,
  CUSTOM_COUNT_MIN,
  DISCOUNT_MAX,
  PACKAGE_IDS,
  PRICING_DURATIONS,
} from './catalog';
import { SITE_COUNTRIES } from './currency';

/** A renewal's calculator inputs; `country` '' is the guardian's country (the API's default). */
export const renewalPricingSchema = z.object({
  pkg: z.enum([...PACKAGE_IDS, 'custom']),
  count: z.int().min(CUSTOM_COUNT_MIN).max(CUSTOM_COUNT_MAX),
  duration: z.literal(PRICING_DURATIONS),
  discount: z.number().min(0).max(DISCOUNT_MAX),
  country: z.enum([...SITE_COUNTRIES, '']),
});
export type RenewalPricing = z.infer<typeof renewalPricingSchema>;
