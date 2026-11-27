import { z } from 'zod';

const count = z.int().nonnegative();

/** What one horizon pass did: rules read, lessons added, rules that failed, rules ended. */
export const horizonRunSummarySchema = z.object({
  rules: count,
  inserted: count,
  failed: count,
  ended: count,
});
export type HorizonRunSummary = z.infer<typeof horizonRunSummarySchema>;
