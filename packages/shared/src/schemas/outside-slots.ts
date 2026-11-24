import { z } from 'zod';
import { instant } from '@ab/core';

// Starts for the next 14 days from the server clock; the client only formats them (rule 6).

/** One start on the grid: UTC instants; inside_hours = within the teacher's weekly availability. */
export const outsideSlotSchema = z.object({
  starts_at: instant,
  ends_at: instant,
  inside_hours: z.boolean(),
});

/** GET /booking/outside-slots (sales: /sales/booking/outside-slots). */
export const outsideSlotsResponseSchema = z.object({
  /** The server's clock when it built the list: the only «now» the client knows. */
  server_now: instant,
  teacher_tz: z.string().min(1),
  step_min: z.int().positive(),
  slots: z.array(outsideSlotSchema),
});

export type OutsideSlot = z.infer<typeof outsideSlotSchema>;
export type OutsideSlotsResponse = z.infer<typeof outsideSlotsResponseSchema>;
