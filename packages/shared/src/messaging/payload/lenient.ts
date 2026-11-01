import { z } from 'zod';

// Lenient readers of a stored or received WhatsApp payload (messages.interactive_payload, Meta's
// and Kapso's message objects): Meta's and Kapso's shapes differ, so a part that is missing or of
// another shape reads as absent instead of failing the whole payload.

/** A non-empty string, else undefined. */
export const lenientText = z.string().min(1).optional().catch(undefined);

/** A string with more than blanks, else undefined. */
export const lenientLabel = z
  .string()
  .refine((s) => s.trim() !== '')
  .optional()
  .catch(undefined);

/** A string, else undefined. */
export const lenientString = z.string().optional().catch(undefined);

/** The parsed value, or null when it does not match the schema. */
export function parseOrNull<T>(schema: z.ZodType<T>, value: unknown): T | null {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
