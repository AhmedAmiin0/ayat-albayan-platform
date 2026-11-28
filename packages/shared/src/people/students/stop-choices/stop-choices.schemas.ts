import { z } from 'zod';

/** The plain stop's numbers (every person who may stop sees them). */
export const stopOweSchema = z.object({
  /** attended × per-lesson price × rate, never above the price (stopRefund's charge). */
  charged: z.number(),
  price: z.number(),
});
export type StopOwe = z.infer<typeof stopOweSchema>;
