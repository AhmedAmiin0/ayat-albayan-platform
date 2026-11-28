import { z } from 'zod';

/** One weekly slot as answered: wall-clock "HH:MM" in `tz`, weekday 0 = Sunday (R-TCH-02). */
export const availabilityRowSchema = z.object({
  id: z.string(),
  weekday: z.int().min(0).max(6),
  start_time: z.string(),
  end_time: z.string(),
  tz: z.string(),
});
export type AvailabilityRow = z.infer<typeof availabilityRowSchema>;

/** GET /teachers/:id/time-off: UTC instants, newest first. */
export const timeOffViewSchema = z.object({
  id: z.string(),
  teacher_id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  reason: z.string().nullable(),
  created_at: z.string(),
  created_by: z.string().nullable(),
  updated_at: z.string(),
});
export type TimeOff = z.infer<typeof timeOffViewSchema>;
