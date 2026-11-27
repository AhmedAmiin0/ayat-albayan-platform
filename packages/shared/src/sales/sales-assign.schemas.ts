import { id } from '@ab/core';
import { z } from 'zod';

/** A salesperson in the admin picker and how many leads they are working; never a phone. */
export const salesPersonViewSchema = z.strictObject({
  id: id(),
  name: z.string(),
  open_leads: z.number().int().nonnegative(),
});
export type SalesPersonView = z.infer<typeof salesPersonViewSchema>;

export const salesAssignedCountSchema = z.strictObject({
  assigned: z.number().int().nonnegative(),
});
export type SalesAssignedCount = z.infer<typeof salesAssignedCountSchema>;
