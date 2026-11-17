import { z } from 'zod';

// The calling-code list (packages/shared/data/countries.json, one source for every app): ISO 3166
// code, calling code, name in Arabic and in English. Parsed with these schemas where it is read.

export const CountrySchema = z.object({
  code: z.string().regex(/^[A-Z]{2}$/),
  /** «+966»; several countries share one (+1, +7, +44…). */
  dial: z.string().regex(/^\+[1-9][0-9]{0,3}$/),
  ar: z.string().min(1),
  en: z.string().min(1),
});
export type CountryData = z.infer<typeof CountrySchema>;
export const CountryListSchema = z.array(CountrySchema).min(1);

/** Regional-indicator letter for A-Z: 🇦 is U+1F1E6. */
const INDICATOR_A = 0x1f1e6;
const A = 'A'.charCodeAt(0);

/** The flag emoji of an ISO code, «SA» → 🇸🇦 (two regional-indicator letters, no image). */
export function flagOf(code: string): string {
  const letters = code.toUpperCase().split('').slice(0, 2);
  return String.fromCodePoint(...letters.map((c) => INDICATOR_A + c.charCodeAt(0) - A));
}
