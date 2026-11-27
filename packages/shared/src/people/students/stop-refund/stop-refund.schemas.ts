import { z } from 'zod';

/** The sheet's lines: paid, attended × per-lesson price × rate, refund. */
export const stopRefundSchema = z.object({
  paid: z.number(),
  perLesson: z.number(),
  attended: z.number(),
  ratePercent: z.number(),
  /** What the attended lessons cost at the rate, never above the price. */
  charged: z.number(),
  /** The most that may be refunded: paid − charged, never below 0. */
  refund: z.number(),
});
export type StopRefund = z.infer<typeof stopRefundSchema>;
