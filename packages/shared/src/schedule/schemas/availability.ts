import { z } from 'zod';
import { optionalText, timeOfDay, timeZone } from '../../core/schemas/index.js';

/** One weekly slot, wall-clock in `tz`. weekday: 0 = الأحد … 6 = السبت. R-TCH-02. */
export const availabilitySlotSchema = z
  .object({
    weekday: z.int().min(0).max(6),
    start_time: timeOfDay,
    end_time: timeOfDay,
    tz: timeZone,
  })
  .refine((s) => s.start_time < s.end_time, { message: 'end_before_start', path: ['end_time'] });

/** Replaces a teacher's whole weekly grid in one call. */
export const availabilityReplaceSchema = z.object({ slots: z.array(availabilitySlotSchema) });

/** One-off unavailability; instants are ISO-8601 with offset, stored UTC (rule 6). R-TCH-02. */
export const timeOffCreateSchema = z
  .object({
    starts_at: z.iso.datetime({ offset: true }),
    ends_at: z.iso.datetime({ offset: true }),
    reason: optionalText,
  })
  .refine((t) => Date.parse(t.starts_at) < Date.parse(t.ends_at), {
    message: 'end_before_start',
    path: ['ends_at'],
  });

export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>;
export type AvailabilityReplace = z.infer<typeof availabilityReplaceSchema>;
export type TimeOffCreate = z.infer<typeof timeOffCreateSchema>;
